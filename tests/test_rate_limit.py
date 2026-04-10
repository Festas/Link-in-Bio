"""
Tests for rate limiting functionality.
"""

import time
import pytest
from unittest.mock import MagicMock, AsyncMock
from app.rate_limit import RateLimiter, LoginRateLimiter


class TestRateLimiter:
    """Tests for the standard RateLimiter."""

    def test_allows_requests_under_limit(self):
        """Requests under the limit should be allowed."""
        limiter = RateLimiter(limit=5, window=60)
        request = MagicMock()
        request.client.host = "127.0.0.1"

        # Should not raise for first 5 requests
        import asyncio

        loop = asyncio.new_event_loop()
        for _ in range(5):
            loop.run_until_complete(limiter(request))
        loop.close()

    def test_blocks_requests_over_limit(self):
        """Requests over the limit should raise HTTPException 429."""
        from fastapi import HTTPException

        limiter = RateLimiter(limit=3, window=60)
        request = MagicMock()
        request.client.host = "127.0.0.1"

        import asyncio

        loop = asyncio.new_event_loop()
        # Use up the limit
        for _ in range(3):
            loop.run_until_complete(limiter(request))

        # Next request should be blocked
        with pytest.raises(HTTPException) as exc_info:
            loop.run_until_complete(limiter(request))
        assert exc_info.value.status_code == 429
        loop.close()

    def test_different_ips_independent(self):
        """Different IPs should have independent limits."""
        limiter = RateLimiter(limit=2, window=60)
        request1 = MagicMock()
        request1.client.host = "10.0.0.1"
        request2 = MagicMock()
        request2.client.host = "10.0.0.2"

        import asyncio

        loop = asyncio.new_event_loop()
        # Use up limit for IP1
        for _ in range(2):
            loop.run_until_complete(limiter(request1))

        # IP2 should still be allowed
        loop.run_until_complete(limiter(request2))
        loop.close()

    def test_window_expiration(self):
        """Old requests should expire and free up the limit."""
        limiter = RateLimiter(limit=2, window=1)
        request = MagicMock()
        request.client.host = "127.0.0.1"

        import asyncio

        loop = asyncio.new_event_loop()
        # Use up the limit
        for _ in range(2):
            loop.run_until_complete(limiter(request))

        # Wait for the window to expire
        time.sleep(1.1)

        # Should be allowed again
        loop.run_until_complete(limiter(request))
        loop.close()


class TestLoginRateLimiter:
    """Tests for LoginRateLimiter with exponential backoff."""

    def test_not_blocked_initially(self):
        """A new IP should not be blocked."""
        limiter = LoginRateLimiter()
        blocked, retry_after = limiter.is_blocked("10.0.0.1")
        assert blocked is False
        assert retry_after == 0

    def test_not_blocked_under_soft_limit(self):
        """IP should not be blocked before reaching soft limit."""
        limiter = LoginRateLimiter(max_attempts_soft=5)
        for _ in range(4):
            limiter.record_failure("10.0.0.1")
        blocked, _ = limiter.is_blocked("10.0.0.1")
        assert blocked is False

    def test_soft_block_at_threshold(self):
        """IP should be soft-blocked at soft limit threshold."""
        limiter = LoginRateLimiter(max_attempts_soft=5, soft_block_seconds=900)
        for _ in range(5):
            limiter.record_failure("10.0.0.1")
        blocked, retry_after = limiter.is_blocked("10.0.0.1")
        assert blocked is True
        assert retry_after > 0
        assert retry_after <= 900

    def test_hard_block_at_threshold(self):
        """IP should be hard-blocked at hard limit threshold."""
        limiter = LoginRateLimiter(
            max_attempts_soft=5, max_attempts_hard=10, hard_block_seconds=3600
        )
        for _ in range(10):
            limiter.record_failure("10.0.0.1")
        blocked, retry_after = limiter.is_blocked("10.0.0.1")
        assert blocked is True
        assert retry_after > 900  # Should be longer than soft block

    def test_clear_removes_block(self):
        """Clearing an IP should remove the block."""
        limiter = LoginRateLimiter(max_attempts_soft=3)
        for _ in range(3):
            limiter.record_failure("10.0.0.1")
        blocked, _ = limiter.is_blocked("10.0.0.1")
        assert blocked is True

        limiter.clear("10.0.0.1")
        blocked, _ = limiter.is_blocked("10.0.0.1")
        assert blocked is False

    def test_clear_nonexistent_ip_no_error(self):
        """Clearing a nonexistent IP should not raise an error."""
        limiter = LoginRateLimiter()
        limiter.clear("nonexistent")  # Should not raise

    def test_different_ips_independent(self):
        """Different IPs should have independent failure counts."""
        limiter = LoginRateLimiter(max_attempts_soft=3)
        for _ in range(3):
            limiter.record_failure("10.0.0.1")
        blocked1, _ = limiter.is_blocked("10.0.0.1")
        blocked2, _ = limiter.is_blocked("10.0.0.2")
        assert blocked1 is True
        assert blocked2 is False

    def test_soft_block_expires(self):
        """Soft block should expire after the configured duration."""
        limiter = LoginRateLimiter(max_attempts_soft=3, soft_block_seconds=1)
        for _ in range(3):
            limiter.record_failure("10.0.0.1")
        blocked, _ = limiter.is_blocked("10.0.0.1")
        assert blocked is True

        time.sleep(1.1)
        blocked, _ = limiter.is_blocked("10.0.0.1")
        assert blocked is False

    def test_record_failure_increments(self):
        """Each failure recording should increment the counter."""
        limiter = LoginRateLimiter(max_attempts_soft=5)
        limiter.record_failure("10.0.0.1")
        assert limiter.failures["10.0.0.1"][0] == 1
        limiter.record_failure("10.0.0.1")
        assert limiter.failures["10.0.0.1"][0] == 2

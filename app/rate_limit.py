import time
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException


class RateLimiter:
    def __init__(self, limit: int = 60, window: int = 60):
        self.limit = limit
        self.window = window
        self.clients: Dict[str, List[float]] = {}

    async def __call__(self, request: Request):
        client_ip = request.client.host
        current_time = time.time()

        if client_ip not in self.clients:
            self.clients[client_ip] = []

        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip] if current_time - timestamp < self.window
        ]

        if len(self.clients[client_ip]) >= self.limit:
            raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte warten Sie einen Moment.")

        self.clients[client_ip].append(current_time)


class LoginRateLimiter:
    """Rate limiter specifically for login attempts with exponential backoff."""

    def __init__(self, max_attempts_soft: int = 5, max_attempts_hard: int = 10,
                 soft_block_seconds: int = 900, hard_block_seconds: int = 3600):
        self.max_attempts_soft = max_attempts_soft
        self.max_attempts_hard = max_attempts_hard
        self.soft_block_seconds = soft_block_seconds
        self.hard_block_seconds = hard_block_seconds
        # ip -> (fail_count, last_fail_time)
        self.failures: Dict[str, Tuple[int, float]] = {}

    def is_blocked(self, ip: str) -> Tuple[bool, int]:
        """Check if an IP is blocked. Returns (is_blocked, retry_after_seconds)."""
        if ip not in self.failures:
            return False, 0

        fail_count, last_fail_time = self.failures[ip]
        now = time.time()

        if fail_count >= self.max_attempts_hard:
            block_until = last_fail_time + self.hard_block_seconds
            if now < block_until:
                return True, int(block_until - now)
        elif fail_count >= self.max_attempts_soft:
            block_until = last_fail_time + self.soft_block_seconds
            if now < block_until:
                return True, int(block_until - now)

        return False, 0

    def record_failure(self, ip: str):
        """Record a failed login attempt."""
        now = time.time()
        if ip in self.failures:
            fail_count, _ = self.failures[ip]
            self.failures[ip] = (fail_count + 1, now)
        else:
            self.failures[ip] = (1, now)

    def clear(self, ip: str):
        """Clear rate limit for an IP after successful login."""
        self.failures.pop(ip, None)


limiter_standard = RateLimiter(limit=60, window=60)
limiter_strict = RateLimiter(limit=10, window=60)
login_limiter = LoginRateLimiter()

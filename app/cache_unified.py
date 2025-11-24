"""
Unified Caching Module
Supports both simple in-memory caching (legacy) and Redis distributed caching (enhanced).
Automatically falls back to in-memory if Redis is unavailable.
"""

import os
import json
import logging
import hashlib
import time
from typing import Any, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps

try:
    import redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "false").lower() in ("true", "1", "yes")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_PREFIX = os.getenv("REDIS_PREFIX", "linkinbio:")

# Default TTLs (in seconds)
DEFAULT_TTL = 3600  # 1 hour
ANALYTICS_TTL = 300  # 5 minutes
SCRAPER_TTL = 86400  # 24 hours
SETTINGS_TTL = 600  # 10 minutes


# ============================================================================
# Cache Backend Interface
# ============================================================================


class CacheBackend:
    """Abstract cache backend interface."""

    def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        raise NotImplementedError

    def delete(self, key: str) -> bool:
        raise NotImplementedError

    def delete_pattern(self, pattern: str) -> int:
        raise NotImplementedError

    def exists(self, key: str) -> bool:
        raise NotImplementedError

    def clear(self) -> bool:
        raise NotImplementedError

    def increment(self, key: str, amount: int = 1) -> int:
        raise NotImplementedError

    def get_stats(self) -> dict:
        raise NotImplementedError


# ============================================================================
# In-Memory Cache Backend (Legacy + Enhanced)
# ============================================================================


class InMemoryCacheBackend(CacheBackend):
    """Simple in-memory cache backend for development."""

    def __init__(self):
        self._cache = {}
        self._expiry = {}
        self.hits = 0
        self.misses = 0

    def _cleanup_expired(self):
        """Remove expired entries."""
        now = time.time()
        expired_keys = [key for key, expiry in self._expiry.items() if expiry and now > expiry]
        for key in expired_keys:
            del self._cache[key]
            del self._expiry[key]

    def get(self, key: str) -> Optional[Any]:
        self._cleanup_expired()
        now = time.time()
        if key in self._cache and (key not in self._expiry or now <= self._expiry[key]):
            self.hits += 1
            return self._cache[key]
        self.misses += 1
        return None

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        self._cache[key] = value
        if ttl > 0:
            self._expiry[key] = time.time() + ttl
        else:
            self._expiry[key] = None
        return True

    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return True
        return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete keys matching a pattern (supports * wildcard)."""
        import re

        regex_pattern = pattern.replace("*", ".*")
        regex = re.compile(regex_pattern)

        matching_keys = [key for key in self._cache.keys() if regex.match(key)]
        for key in matching_keys:
            self.delete(key)

        return len(matching_keys)

    def exists(self, key: str) -> bool:
        now = time.time()
        return key in self._cache and (key not in self._expiry or now <= self._expiry[key])

    def clear(self) -> bool:
        self._cache.clear()
        self._expiry.clear()
        return True

    def increment(self, key: str, amount: int = 1) -> int:
        current = self._cache.get(key, 0)
        new_value = current + amount
        self._cache[key] = new_value
        return new_value

    def get_stats(self) -> dict:
        self._cleanup_expired()
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0

        return {
            "backend": "in-memory",
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.2f}%",
            "keys_count": len(self._cache),
            "memory_mb": 0,  # Not available for in-memory backend
        }

    # Legacy API compatibility
    def invalidate(self, prefix: str = ""):
        """Legacy: Invalidate keys with prefix."""
        if not prefix:
            self.clear()
        else:
            return self.delete_pattern(f"{prefix}*")


# ============================================================================
# Redis Cache Backend (Enhanced)
# ============================================================================


class RedisCacheBackend(CacheBackend):
    """Redis cache backend for production."""

    def __init__(self):
        if not REDIS_AVAILABLE:
            raise ImportError("Redis library not installed. Install with: pip install redis")

        self.client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )

        # Test connection
        try:
            self.client.ping()
            logger.info(f"✓ Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
        except redis.ConnectionError as e:
            logger.error(f"✗ Failed to connect to Redis: {e}")
            raise

    def _make_key(self, key: str) -> str:
        """Add prefix to key."""
        return f"{REDIS_PREFIX}{key}"

    def get(self, key: str) -> Optional[Any]:
        try:
            value = self.client.get(self._make_key(key))
            if value is None:
                return None

            # Try to deserialize JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except redis.RedisError as e:
            logger.error(f"Redis get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        try:
            # Serialize to JSON if not a string
            if not isinstance(value, str):
                value = json.dumps(value)

            if ttl > 0:
                return self.client.setex(self._make_key(key), ttl, value)
            else:
                return self.client.set(self._make_key(key), value)
        except redis.RedisError as e:
            logger.error(f"Redis set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        try:
            return self.client.delete(self._make_key(key)) > 0
        except redis.RedisError as e:
            logger.error(f"Redis delete error: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete keys matching a pattern."""
        try:
            keys = self.client.keys(self._make_key(pattern))
            if keys:
                return self.client.delete(*keys)
            return 0
        except redis.RedisError as e:
            logger.error(f"Redis delete_pattern error: {e}")
            return 0

    def exists(self, key: str) -> bool:
        try:
            return self.client.exists(self._make_key(key)) > 0
        except redis.RedisError as e:
            logger.error(f"Redis exists error: {e}")
            return False

    def clear(self) -> bool:
        try:
            # Only clear keys with our prefix
            keys = self.client.keys(f"{REDIS_PREFIX}*")
            if keys:
                self.client.delete(*keys)
            return True
        except redis.RedisError as e:
            logger.error(f"Redis clear error: {e}")
            return False

    def increment(self, key: str, amount: int = 1) -> int:
        try:
            return self.client.incrby(self._make_key(key), amount)
        except redis.RedisError as e:
            logger.error(f"Redis increment error: {e}")
            return 0

    def get_stats(self) -> dict:
        try:
            info = self.client.info("stats")
            memory_info = self.client.info("memory")

            keys_count = len(self.client.keys(f"{REDIS_PREFIX}*"))
            hit_rate = self._calculate_hit_rate(info.get("keyspace_hits", 0), info.get("keyspace_misses", 0))

            return {
                "backend": "redis",
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": f"{hit_rate:.2f}%",
                "keys_count": keys_count,
                "memory_mb": f"{memory_info.get('used_memory', 0) / 1024 / 1024:.2f}",
            }
        except redis.RedisError as e:
            logger.error(f"Redis stats error: {e}")
            return {"backend": "redis", "error": str(e)}

    @staticmethod
    def _calculate_hit_rate(hits: int, misses: int) -> float:
        """Calculate cache hit rate percentage."""
        total = hits + misses
        if total == 0:
            return 0.0
        return (hits / total) * 100

    # Legacy API compatibility
    def invalidate(self, prefix: str = ""):
        """Legacy: Invalidate keys with prefix."""
        if not prefix:
            self.clear()
        else:
            return self.delete_pattern(f"{prefix}*")


# ============================================================================
# Unified Cache Manager
# ============================================================================


class UnifiedCache:
    """
    Unified cache manager that automatically chooses backend.
    Provides both legacy and enhanced API.
    """

    def __init__(self):
        # Initialize backend
        if REDIS_ENABLED and REDIS_AVAILABLE:
            try:
                self.backend = RedisCacheBackend()
                logger.info("✓ Using Redis cache backend")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis, falling back to in-memory cache: {e}")
                self.backend = InMemoryCacheBackend()
        else:
            self.backend = InMemoryCacheBackend()
            if REDIS_ENABLED:
                logger.warning("Redis enabled but library not available. Using in-memory cache.")
            else:
                logger.info("✓ Using in-memory cache backend")

        # Cache groups for bulk invalidation
        self.groups = {}

    # Core API
    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        return self.backend.get(key)

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL, group: Optional[str] = None) -> bool:
        """Set a value in cache with optional grouping."""
        result = self.backend.set(key, value, ttl)

        # Track group membership
        if group and result:
            if group not in self.groups:
                self.groups[group] = set()
            self.groups[group].add(key)

        return result

    def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        return self.backend.delete(key)

    def invalidate(self, prefix: str = "") -> int:
        """Invalidate keys matching a prefix pattern (legacy API)."""
        if not prefix:
            return self.clear()
        return self.backend.delete_pattern(f"{prefix}*")

    def invalidate_group(self, group: str) -> int:
        """Invalidate all keys in a group."""
        if group not in self.groups:
            return 0

        count = 0
        for key in self.groups[group]:
            if self.backend.delete(key):
                count += 1

        self.groups[group].clear()
        return count

    def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        return self.backend.exists(key)

    def clear(self) -> bool:
        """Clear all cache entries."""
        self.groups.clear()
        return self.backend.clear()

    def increment(self, key: str, amount: int = 1) -> int:
        """Increment a counter."""
        return self.backend.increment(key, amount)

    def get_stats(self) -> dict:
        """Get cache statistics."""
        stats = self.backend.get_stats()
        stats["groups_count"] = len(self.groups)
        return stats

    def cached(self, key: Optional[str] = None, ttl: int = DEFAULT_TTL, group: Optional[str] = None):
        """
        Decorator to cache function results.

        Usage:
            @cache.cached(key="my_function", ttl=3600)
            def my_function(arg1, arg2):
                # expensive operation
                return result
        """

        def decorator(func: Callable):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = key
                if cache_key is None:
                    # Auto-generate key from function name and arguments
                    key_parts = [func.__name__]
                    key_parts.extend(str(arg) for arg in args)
                    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                    key_str = ":".join(key_parts)
                    cache_key = hashlib.md5(key_str.encode()).hexdigest()

                # Try to get from cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Execute function
                result = await func(*args, **kwargs)

                # Store in cache
                self.set(cache_key, result, ttl=ttl, group=group)

                return result

            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = key
                if cache_key is None:
                    key_parts = [func.__name__]
                    key_parts.extend(str(arg) for arg in args)
                    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                    key_str = ":".join(key_parts)
                    cache_key = hashlib.md5(key_str.encode()).hexdigest()

                # Try to get from cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Execute function
                result = func(*args, **kwargs)

                # Store in cache
                self.set(cache_key, result, ttl=ttl, group=group)

                return result

            # Return appropriate wrapper based on function type
            import asyncio

            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            else:
                return sync_wrapper

        return decorator


# ============================================================================
# Legacy Cache Class (for backward compatibility)
# ============================================================================


class InMemoryCache:
    """Legacy cache class - redirects to UnifiedCache."""

    def __init__(self):
        self._unified = UnifiedCache()

    def get(self, key: str) -> Optional[Any]:
        return self._unified.get(key)

    def set(self, key: str, value: Any, ttl: int = 300):
        return self._unified.set(key, value, ttl)

    def invalidate(self, prefix: str = ""):
        return self._unified.invalidate(prefix)


# ============================================================================
# Global Cache Instances
# ============================================================================

# Unified cache instance (recommended)
cache = UnifiedCache()

# Legacy cache instance (for backward compatibility)
cache_legacy = InMemoryCache()

"""
Tests for Enhanced Caching Module
"""
import pytest
import time
from app.cache_unified import (
    InMemoryCacheBackend,
    UnifiedCache,
    DEFAULT_TTL,
)


class TestInMemoryCacheBackend:
    """Test in-memory cache backend."""
    
    def setup_method(self):
        """Create fresh cache for each test."""
        self.cache = InMemoryCacheBackend()
    
    def test_set_and_get(self):
        """Test basic set and get operations."""
        self.cache.set("key1", "value1")
        assert self.cache.get("key1") == "value1"
    
    def test_get_nonexistent(self):
        """Test getting a non-existent key."""
        assert self.cache.get("nonexistent") is None
    
    def test_set_with_ttl(self):
        """Test setting with TTL."""
        self.cache.set("key1", "value1", ttl=1)
        assert self.cache.get("key1") == "value1"
        
        # Wait for expiry
        time.sleep(1.1)
        assert self.cache.get("key1") is None
    
    def test_delete(self):
        """Test deleting a key."""
        self.cache.set("key1", "value1")
        assert self.cache.get("key1") == "value1"
        
        self.cache.delete("key1")
        assert self.cache.get("key1") is None
    
    def test_delete_pattern(self):
        """Test deleting keys by pattern."""
        self.cache.set("user:1", "data1")
        self.cache.set("user:2", "data2")
        self.cache.set("user:3", "data3")
        self.cache.set("admin:1", "admin_data")
        
        # Delete all user keys
        count = self.cache.delete_pattern("user:*")
        assert count == 3
        
        # Admin key should still exist
        assert self.cache.get("admin:1") == "admin_data"
        assert self.cache.get("user:1") is None
    
    def test_exists(self):
        """Test checking if key exists."""
        assert self.cache.exists("key1") is False
        
        self.cache.set("key1", "value1")
        assert self.cache.exists("key1") is True
        
        self.cache.delete("key1")
        assert self.cache.exists("key1") is False
    
    def test_clear(self):
        """Test clearing all cache."""
        self.cache.set("key1", "value1")
        self.cache.set("key2", "value2")
        self.cache.set("key3", "value3")
        
        self.cache.clear()
        
        assert self.cache.get("key1") is None
        assert self.cache.get("key2") is None
        assert self.cache.get("key3") is None
    
    def test_increment(self):
        """Test incrementing a counter."""
        assert self.cache.increment("counter") == 1
        assert self.cache.increment("counter") == 2
        assert self.cache.increment("counter", 5) == 7
    
    def test_stats(self):
        """Test getting cache statistics."""
        # Generate some hits and misses
        self.cache.set("key1", "value1")
        self.cache.get("key1")  # Hit
        self.cache.get("key2")  # Miss
        self.cache.get("key1")  # Hit
        
        stats = self.cache.get_stats()
        
        assert stats["backend"] == "in-memory"
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert "66.67%" in stats["hit_rate"]
    
    def test_complex_values(self):
        """Test storing complex data types."""
        data = {
            "name": "Test",
            "items": [1, 2, 3],
            "nested": {"key": "value"}
        }
        
        self.cache.set("complex", data)
        retrieved = self.cache.get("complex")
        
        assert retrieved == data
        assert retrieved["items"] == [1, 2, 3]


class TestEnhancedCache:
    """Test enhanced cache manager."""
    
    def setup_method(self):
        """Create fresh cache for each test."""
        self.cache = UnifiedCache()
        self.cache.clear()
    
    def test_basic_operations(self):
        """Test basic cache operations."""
        self.cache.set("key1", "value1")
        assert self.cache.get("key1") == "value1"
        
        self.cache.delete("key1")
        assert self.cache.get("key1") is None
    
    def test_cache_groups(self):
        """Test cache grouping functionality."""
        # Add items to a group
        self.cache.set("user:1", "data1", group="users")
        self.cache.set("user:2", "data2", group="users")
        self.cache.set("user:3", "data3", group="users")
        self.cache.set("admin:1", "admin", group="admins")
        
        # Invalidate the users group
        count = self.cache.invalidate_group("users")
        assert count == 3
        
        # Users should be gone
        assert self.cache.get("user:1") is None
        assert self.cache.get("user:2") is None
        
        # Admin should still exist
        assert self.cache.get("admin:1") == "admin"
    
    def test_invalidate_pattern(self):
        """Test invalidating by pattern."""
        self.cache.set("prefix:1", "data1")
        self.cache.set("prefix:2", "data2")
        self.cache.set("other:1", "data3")
        
        count = self.cache.invalidate("prefix:*")
        assert count == 2
        
        assert self.cache.get("prefix:1") is None
        assert self.cache.get("other:1") == "data3"
    
    def test_cache_decorator_sync(self):
        """Test cache decorator with sync function."""
        call_count = 0
        
        @self.cache.cached(ttl=60)  # No fixed key - auto-generate from args
        def expensive_function(x, y):
            nonlocal call_count
            call_count += 1
            return x + y
        
        # First call - should execute
        result1 = expensive_function(2, 3)
        assert result1 == 5
        assert call_count == 1
        
        # Second call - should use cache
        result2 = expensive_function(2, 3)
        assert result2 == 5
        assert call_count == 1  # Not incremented
        
        # Different args - should execute (different cache key)
        result3 = expensive_function(3, 4)
        assert result3 == 7
        assert call_count == 2  # Incremented for new args
    
    def test_cache_decorator_async(self):
        """Test cache decorator with async function."""
        import asyncio
        
        call_count = 0
        
        @self.cache.cached(key="async_expensive", ttl=60)
        async def expensive_async_function(x, y):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)
            return x * y
        
        async def run_test():
            # First call - should execute
            result1 = await expensive_async_function(2, 3)
            assert result1 == 6
            assert call_count == 1
            
            # Second call - should use cache
            result2 = await expensive_async_function(2, 3)
            assert result2 == 6
            assert call_count == 1
        
        asyncio.run(run_test())
    
    def test_get_stats(self):
        """Test getting cache statistics."""
        stats = self.cache.get_stats()
        
        assert "backend" in stats
        assert "hits" in stats
        assert "misses" in stats
        assert "hit_rate" in stats
        assert "keys_count" in stats


class TestCachePerformance:
    """Test cache performance characteristics."""
    
    def setup_method(self):
        """Create fresh cache for each test."""
        self.cache = UnifiedCache()
        self.cache.clear()
    
    def test_large_dataset(self):
        """Test cache with large dataset."""
        # Store 1000 items
        for i in range(1000):
            self.cache.set(f"item:{i}", f"data_{i}", ttl=60)
        
        # Verify all stored
        assert self.cache.get("item:0") == "data_0"
        assert self.cache.get("item:500") == "data_500"
        assert self.cache.get("item:999") == "data_999"
        
        # Check stats
        stats = self.cache.get_stats()
        assert stats["keys_count"] >= 1000
    
    def test_rapid_operations(self):
        """Test rapid cache operations."""
        import time
        
        start = time.time()
        
        # Rapid writes
        for i in range(100):
            self.cache.set(f"rapid:{i}", f"value_{i}")
        
        # Rapid reads
        for i in range(100):
            self.cache.get(f"rapid:{i}")
        
        elapsed = time.time() - start
        
        # Should complete in reasonable time (< 1 second)
        assert elapsed < 1.0
    
    def test_ttl_accuracy(self):
        """Test TTL accuracy."""
        self.cache.set("ttl_test", "value", ttl=1)
        
        # Should exist immediately
        assert self.cache.exists("ttl_test") is True
        
        # Wait half TTL
        time.sleep(0.5)
        assert self.cache.exists("ttl_test") is True
        
        # Wait full TTL
        time.sleep(0.6)
        assert self.cache.exists("ttl_test") is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

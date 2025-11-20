import time
from typing import Any, Optional

class InMemoryCache:
    def __init__(self):
        self._store = {}

    def get(self, key: str) -> Optional[Any]:
        data = self._store.get(key)
        if not data:
            return None
        
        if data['expires_at'] < time.time():
            del self._store[key]
            return None
            
        return data['value']

    def set(self, key: str, value: Any, ttl: int = 300):
        self._store[key] = {
            'value': value,
            'expires_at': time.time() + ttl
        }

    def invalidate(self, prefix: str = ""):
        if not prefix:
            self._store = {}
        else:
            keys_to_delete = [k for k in self._store.keys() if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]

cache = InMemoryCache()
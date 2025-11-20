import time
from typing import Dict, List
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
            timestamp for timestamp in self.clients[client_ip] 
            if current_time - timestamp < self.window
        ]
        
        if len(self.clients[client_ip]) >= self.limit:
            raise HTTPException(
                status_code=429, 
                detail="Zu viele Anfragen. Bitte warten Sie einen Moment."
            )
        
        self.clients[client_ip].append(current_time)

limiter_standard = RateLimiter(limit=60, window=60)
limiter_strict = RateLimiter(limit=10, window=60)
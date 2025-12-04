"""
Reactions Router
Handles link reactions for social engagement (👍 ❤️ 🔥 etc.).
"""

import hashlib
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel

from ..database import get_db_connection
from ..rate_limit import limiter_standard

router = APIRouter()

# Valid reaction types
VALID_REACTIONS = {"like", "love", "fire", "laugh", "wow", "sad"}


class ReactionRequest(BaseModel):
    reaction_type: str


class ReactionResponse(BaseModel):
    item_id: int
    reactions: Dict[str, int]
    user_reaction: Optional[str] = None


def get_ip_hash(ip: str) -> str:
    """Hash the IP address for privacy while preventing duplicates.
    
    Uses full SHA256 hash for security while maintaining privacy.
    """
    return hashlib.sha256(ip.encode()).hexdigest()


@router.get("/{item_id}", response_model=ReactionResponse, dependencies=[Depends(limiter_standard)])
async def get_reactions(item_id: int, request: Request):
    """Get reaction counts for an item."""
    ip_hash = get_ip_hash(request.client.host)

    with get_db_connection() as conn:
        # Get all reaction counts for the item
        cursor = conn.execute(
            """SELECT reaction_type, COUNT(*) as count 
               FROM reactions 
               WHERE item_id = ? 
               GROUP BY reaction_type""",
            (item_id,),
        )
        reactions = {row["reaction_type"]: row["count"] for row in cursor.fetchall()}

        # Check if user has reacted
        cursor = conn.execute(
            """SELECT reaction_type FROM reactions 
               WHERE item_id = ? AND ip_hash = ?""",
            (item_id, ip_hash),
        )
        user_reaction = cursor.fetchone()

    return ReactionResponse(
        item_id=item_id,
        reactions=reactions,
        user_reaction=user_reaction["reaction_type"] if user_reaction else None,
    )


@router.post("/{item_id}", response_model=ReactionResponse, dependencies=[Depends(limiter_standard)])
async def add_reaction(item_id: int, req: ReactionRequest, request: Request):
    """Add or update a reaction to an item."""
    if req.reaction_type not in VALID_REACTIONS:
        raise HTTPException(400, f"Invalid reaction type. Valid types: {', '.join(VALID_REACTIONS)}")

    ip_hash = get_ip_hash(request.client.host)

    with get_db_connection() as conn:
        # Check if item exists
        item = conn.execute("SELECT id FROM items WHERE id = ?", (item_id,)).fetchone()
        if not item:
            raise HTTPException(404, "Item not found")

        # Check for existing reaction from this user
        existing = conn.execute(
            """SELECT id, reaction_type FROM reactions 
               WHERE item_id = ? AND ip_hash = ?""",
            (item_id, ip_hash),
        ).fetchone()

        if existing:
            if existing["reaction_type"] == req.reaction_type:
                # Same reaction - remove it (toggle off)
                conn.execute("DELETE FROM reactions WHERE id = ?", (existing["id"],))
            else:
                # Different reaction - update it
                conn.execute(
                    "UPDATE reactions SET reaction_type = ? WHERE id = ?",
                    (req.reaction_type, existing["id"]),
                )
        else:
            # New reaction
            conn.execute(
                "INSERT INTO reactions (item_id, reaction_type, ip_hash) VALUES (?, ?, ?)",
                (item_id, req.reaction_type, ip_hash),
            )

        conn.commit()

        # Get updated counts
        cursor = conn.execute(
            """SELECT reaction_type, COUNT(*) as count 
               FROM reactions 
               WHERE item_id = ? 
               GROUP BY reaction_type""",
            (item_id,),
        )
        reactions = {row["reaction_type"]: row["count"] for row in cursor.fetchall()}

        # Check user's current reaction
        cursor = conn.execute(
            """SELECT reaction_type FROM reactions 
               WHERE item_id = ? AND ip_hash = ?""",
            (item_id, ip_hash),
        )
        user_reaction = cursor.fetchone()

    return ReactionResponse(
        item_id=item_id,
        reactions=reactions,
        user_reaction=user_reaction["reaction_type"] if user_reaction else None,
    )


@router.delete("/{item_id}", dependencies=[Depends(limiter_standard)])
async def remove_reaction(item_id: int, request: Request):
    """Remove the user's reaction from an item."""
    ip_hash = get_ip_hash(request.client.host)

    with get_db_connection() as conn:
        conn.execute(
            "DELETE FROM reactions WHERE item_id = ? AND ip_hash = ?",
            (item_id, ip_hash),
        )
        conn.commit()

    return Response(status_code=204)


@router.get("/stats/all", response_model=Dict[int, Dict[str, int]])
async def get_all_reaction_stats():
    """Get reaction stats for all items (for bulk display)."""
    with get_db_connection() as conn:
        cursor = conn.execute(
            """SELECT item_id, reaction_type, COUNT(*) as count 
               FROM reactions 
               GROUP BY item_id, reaction_type"""
        )

        stats = {}
        for row in cursor.fetchall():
            item_id = row["item_id"]
            if item_id not in stats:
                stats[item_id] = {}
            stats[item_id][row["reaction_type"]] = row["count"]

    return stats

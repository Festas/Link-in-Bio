"""
Analytics Router
Handles analytics data retrieval and filtering.
"""
from datetime import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends

from ..models import AnalyticsData
from ..database import get_db_connection
from ..auth_unified import require_auth

router = APIRouter()


@router.get("", response_model=AnalyticsData)
async def get_analytics(user=Depends(require_auth)):
    """Get basic analytics data."""
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(id) FROM clicks")
        total_clicks = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(id) FROM subscribers")
        total_subs = cur.fetchone()[0] or 0

        cur.execute(
            "SELECT date(timestamp) as day, COUNT(id) as clicks FROM clicks WHERE timestamp >= date('now', '-30 days') GROUP BY day ORDER BY day ASC"
        )
        clicks_per_day = [dict(r) for r in cur.fetchall()]

        cur.execute(
            "SELECT i.id, i.title, COUNT(c.id) as clicks FROM clicks c JOIN items i ON c.item_id = i.id GROUP BY i.id, i.title ORDER BY clicks DESC LIMIT 10"
        )
        top_links = [dict(r) for r in cur.fetchall()]

        cur.execute(
            "SELECT CASE WHEN referer IS NULL OR referer = '' THEN '(Direkt)' ELSE referer END as referer_domain, COUNT(id) as clicks FROM clicks GROUP BY referer_domain ORDER BY clicks DESC LIMIT 10"
        )
        top_referers = [dict(r) for r in cur.fetchall()]

        cur.execute(
            "SELECT CASE WHEN country_code IS NULL THEN 'Unbekannt' ELSE country_code END as country, COUNT(id) as clicks FROM clicks GROUP BY country ORDER BY clicks DESC LIMIT 10"
        )
        top_countries = [dict(r) for r in cur.fetchall()]

        return AnalyticsData(
            total_clicks=total_clicks,
            clicks_per_day=clicks_per_day,
            top_links=top_links,
            top_referers=top_referers,
            top_countries=top_countries,
            total_subscribers=total_subs,
        )


@router.get("/advanced")
async def get_advanced_analytics(
    user=Depends(require_auth),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    item_id: Optional[int] = None,
    country: Optional[str] = None,
    referer: Optional[str] = None,
):
    """
    Advanced analytics endpoint with filtering capabilities.
    Supports filtering by date range, item, country, and referrer.
    """
    with get_db_connection() as conn:
        cur = conn.cursor()
        
        # Build WHERE clauses for filters
        where_clauses = []
        params = []
        
        if start_date:
            where_clauses.append("date(timestamp) >= ?")
            params.append(start_date)
        
        if end_date:
            where_clauses.append("date(timestamp) <= ?")
            params.append(end_date)
        
        if item_id:
            where_clauses.append("item_id = ?")
            params.append(item_id)
        
        if country and country != "all":
            if country == "unknown":
                where_clauses.append("(country_code IS NULL OR country_code = '')")
            else:
                where_clauses.append("country_code = ?")
                params.append(country)
        
        if referer and referer != "all":
            if referer == "direct":
                where_clauses.append("(referer IS NULL OR referer = '')")
            else:
                where_clauses.append("referer = ?")
                params.append(referer)
        
        where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        # Total clicks with filters - using parameterized query
        query_total = "SELECT COUNT(id) FROM clicks WHERE " + where_clause
        cur.execute(query_total, params)
        total_clicks = cur.fetchone()[0] or 0
        
        # Clicks per day (last 30 days by default, or filtered range)
        date_range_days = 30
        if start_date and end_date:
            # Calculate days between dates
            try:
                d1 = dt.strptime(start_date, "%Y-%m-%d")
                d2 = dt.strptime(end_date, "%Y-%m-%d")
                date_range_days = max((d2 - d1).days, 1)
            except (ValueError, TypeError):
                date_range_days = 30
        
        query_days = (
            "SELECT date(timestamp) as day, COUNT(id) as clicks FROM clicks "
            "WHERE " + where_clause + " GROUP BY day ORDER BY day DESC LIMIT ?"
        )
        cur.execute(query_days, params + [min(date_range_days, 365)])
        clicks_per_day = [dict(r) for r in cur.fetchall()]
        clicks_per_day.reverse()  # Show chronologically
        
        # Top links with filters
        query_links = (
            "SELECT i.id, i.title, COUNT(c.id) as clicks FROM clicks c "
            "JOIN items i ON c.item_id = i.id WHERE " + where_clause +
            " GROUP BY i.id, i.title ORDER BY clicks DESC LIMIT 20"
        )
        cur.execute(query_links, params)
        top_links = [dict(r) for r in cur.fetchall()]
        
        # Top referrers with filters
        query_referers = (
            "SELECT CASE WHEN referer IS NULL OR referer = '' THEN '(Direkt)' ELSE referer END as referer_domain, "
            "COUNT(id) as clicks FROM clicks WHERE " + where_clause +
            " GROUP BY referer_domain ORDER BY clicks DESC LIMIT 20"
        )
        cur.execute(query_referers, params)
        top_referers = [dict(r) for r in cur.fetchall()]
        
        # Top countries with filters
        query_countries = (
            "SELECT CASE WHEN country_code IS NULL THEN 'Unbekannt' ELSE country_code END as country, "
            "COUNT(id) as clicks FROM clicks WHERE " + where_clause +
            " GROUP BY country ORDER BY clicks DESC LIMIT 20"
        )
        cur.execute(query_countries, params)
        top_countries = [dict(r) for r in cur.fetchall()]
        
        # Hourly distribution
        query_hourly = (
            "SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, "
            "COUNT(id) as clicks FROM clicks WHERE " + where_clause +
            " GROUP BY hour ORDER BY hour ASC"
        )
        cur.execute(query_hourly, params)
        clicks_per_hour = [dict(r) for r in cur.fetchall()]
        
        # Clicks by day of week
        query_weekday = (
            "SELECT CAST(strftime('%w', timestamp) AS INTEGER) as day_of_week, "
            "COUNT(id) as clicks FROM clicks WHERE " + where_clause +
            " GROUP BY day_of_week ORDER BY day_of_week ASC"
        )
        cur.execute(query_weekday, params)
        clicks_per_weekday = [dict(r) for r in cur.fetchall()]
        
        return {
            "total_clicks": total_clicks,
            "clicks_per_day": clicks_per_day,
            "top_links": top_links,
            "top_referers": top_referers,
            "top_countries": top_countries,
            "clicks_per_hour": clicks_per_hour,
            "clicks_per_weekday": clicks_per_weekday,
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "item_id": item_id,
                "country": country,
                "referer": referer,
            }
        }

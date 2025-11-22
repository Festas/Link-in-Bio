"""
Enhanced Analytics Module with Conversion Tracking, Events, and Advanced Metrics
Provides enterprise-grade analytics capabilities missing from the original implementation.
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Types of trackable events."""
    PAGEVIEW = "pageview"
    CLICK = "click"
    CONVERSION = "conversion"
    SIGNUP = "signup"
    PURCHASE = "purchase"
    DOWNLOAD = "download"
    VIDEO_PLAY = "video_play"
    VIDEO_COMPLETE = "video_complete"
    FORM_SUBMIT = "form_submit"
    SHARE = "share"
    CUSTOM = "custom"


class ConversionGoal(BaseModel):
    """Conversion goal definition."""
    id: str
    name: str
    description: Optional[str] = None
    event_type: EventType
    value: Optional[float] = None  # Monetary value
    url_pattern: Optional[str] = None  # For URL-based goals
    is_active: bool = True


class AnalyticsEvent(BaseModel):
    """Analytics event model."""
    event_type: EventType
    timestamp: datetime
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    page_id: Optional[int] = None
    item_id: Optional[int] = None
    url: Optional[str] = None
    referer: Optional[str] = None
    country_code: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    properties: Dict[str, Any] = {}
    conversion_goal_id: Optional[str] = None
    conversion_value: Optional[float] = None


class FunnelStep(BaseModel):
    """Funnel step definition."""
    order: int
    name: str
    event_type: EventType
    url_pattern: Optional[str] = None
    required: bool = True


class Funnel(BaseModel):
    """Conversion funnel definition."""
    id: str
    name: str
    description: Optional[str] = None
    steps: List[FunnelStep]
    is_active: bool = True


class EnhancedAnalytics:
    """Enhanced analytics engine with advanced features."""
    
    def __init__(self, db_connection_getter):
        """
        Initialize analytics engine.
        
        Args:
            db_connection_getter: Function that returns database connection context manager
        """
        self.get_db = db_connection_getter
        self.conversion_goals: Dict[str, ConversionGoal] = {}
        self.funnels: Dict[str, Funnel] = {}
        self._initialize_tables()
    
    def _initialize_tables(self):
        """Create analytics tables if they don't exist."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Events table with enhanced tracking
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS analytics_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_type TEXT NOT NULL,
                        timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
                        session_id TEXT,
                        user_id TEXT,
                        page_id INTEGER,
                        item_id INTEGER,
                        url TEXT,
                        referer TEXT,
                        country_code TEXT,
                        device_type TEXT,
                        browser TEXT,
                        utm_source TEXT,
                        utm_medium TEXT,
                        utm_campaign TEXT,
                        utm_content TEXT,
                        utm_term TEXT,
                        properties TEXT,
                        conversion_goal_id TEXT,
                        conversion_value REAL,
                        FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL,
                        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
                    )
                """)
                
                # Conversion goals table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS conversion_goals (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        event_type TEXT NOT NULL,
                        value REAL,
                        url_pattern TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
                    )
                """)
                
                # Funnels table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS funnels (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT (datetime('now', 'localtime'))
                    )
                """)
                
                # Funnel steps table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS funnel_steps (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        funnel_id TEXT NOT NULL,
                        step_order INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        url_pattern TEXT,
                        required BOOLEAN DEFAULT 1,
                        FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE
                    )
                """)
                
                # A/B test variants table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS ab_test_variants (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        test_name TEXT NOT NULL,
                        variant_name TEXT NOT NULL,
                        item_id INTEGER,
                        is_control BOOLEAN DEFAULT 0,
                        traffic_percentage INTEGER DEFAULT 50,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
                        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON analytics_events(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_item ON analytics_events(item_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_conversion ON analytics_events(conversion_goal_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_utm_source ON analytics_events(utm_source)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_utm_campaign ON analytics_events(utm_campaign)")
                
                conn.commit()
                logger.info("✓ Analytics tables initialized")
        except Exception as e:
            logger.error(f"Failed to initialize analytics tables: {e}")
    
    def track_event(self, event: AnalyticsEvent) -> bool:
        """Track an analytics event."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                import json
                properties_json = json.dumps(event.properties) if event.properties else None
                
                cursor.execute("""
                    INSERT INTO analytics_events (
                        event_type, session_id, user_id, page_id, item_id,
                        url, referer, country_code, device_type, browser,
                        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                        properties, conversion_goal_id, conversion_value
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event.event_type, event.session_id, event.user_id, event.page_id, event.item_id,
                    event.url, event.referer, event.country_code, event.device_type, event.browser,
                    event.utm_source, event.utm_medium, event.utm_campaign, event.utm_content, event.utm_term,
                    properties_json, event.conversion_goal_id, event.conversion_value
                ))
                
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to track event: {e}")
            return False
    
    def get_conversion_rate(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        conversion_goal_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculate conversion rate."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Build WHERE clause more elegantly
                where_conditions = []
                params = []
                
                if start_date:
                    where_conditions.append("timestamp >= ?")
                    params.append(start_date)
                
                if end_date:
                    where_conditions.append("timestamp <= ?")
                    params.append(end_date)
                
                # Get total sessions (pageviews)
                pageview_where = " AND ".join(where_conditions) if where_conditions else "1=1"
                cursor.execute(f"""
                    SELECT COUNT(DISTINCT session_id)
                    FROM analytics_events
                    WHERE event_type = 'pageview' AND ({pageview_where})
                """, params)
                total_sessions = cursor.fetchone()[0] or 0
                
                # Get conversions
                conversion_conditions = where_conditions.copy()
                conversion_params = params.copy()
                
                if conversion_goal_id:
                    conversion_conditions.append("conversion_goal_id = ?")
                    conversion_params.append(conversion_goal_id)
                
                conversion_where = " AND ".join(conversion_conditions) if conversion_conditions else "1=1"
                cursor.execute(f"""
                    SELECT 
                        COUNT(DISTINCT session_id) as conversions,
                        SUM(conversion_value) as total_value
                    FROM analytics_events
                    WHERE event_type = 'conversion' AND ({conversion_where})
                """, conversion_params)
                
                row = cursor.fetchone()
                conversions = row[0] or 0
                total_value = row[1] or 0.0
                
                # Calculate rate
                conversion_rate = (conversions / total_sessions * 100) if total_sessions > 0 else 0
                
                return {
                    "total_sessions": total_sessions,
                    "conversions": conversions,
                    "conversion_rate": round(conversion_rate, 2),
                    "total_value": round(total_value, 2),
                    "avg_value_per_conversion": round(total_value / conversions, 2) if conversions > 0 else 0
                }
        except Exception as e:
            logger.error(f"Failed to get conversion rate: {e}")
            return {
                "total_sessions": 0,
                "conversions": 0,
                "conversion_rate": 0,
                "total_value": 0,
                "avg_value_per_conversion": 0
            }
    
    def get_funnel_analytics(self, funnel_id: str, days: int = 30) -> Dict[str, Any]:
        """Get funnel analytics showing drop-off at each step."""
        if funnel_id not in self.funnels:
            return {"error": "Funnel not found"}
        
        funnel = self.funnels[funnel_id]
        start_date = datetime.utcnow() - timedelta(days=days)
        
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Track unique sessions through each step
                step_results = []
                
                for step in sorted(funnel.steps, key=lambda s: s.order):
                    # Get sessions that completed this step
                    cursor.execute("""
                        SELECT COUNT(DISTINCT session_id)
                        FROM analytics_events
                        WHERE event_type = ?
                        AND timestamp >= ?
                    """, (step.event_type, start_date))
                    
                    count = cursor.fetchone()[0] or 0
                    
                    step_results.append({
                        "step_order": step.order,
                        "step_name": step.name,
                        "sessions": count,
                        "drop_off": 0,  # Calculated below
                        "conversion_rate": 0  # Calculated below
                    })
                
                # Calculate drop-off and conversion rates
                if step_results:
                    initial_sessions = step_results[0]["sessions"]
                    
                    for i, step in enumerate(step_results):
                        if i > 0:
                            previous_sessions = step_results[i - 1]["sessions"]
                            drop_off = previous_sessions - step["sessions"]
                            step["drop_off"] = drop_off
                            step["drop_off_rate"] = round(drop_off / previous_sessions * 100, 2) if previous_sessions > 0 else 0
                        
                        # Conversion rate from start
                        step["conversion_rate"] = round(step["sessions"] / initial_sessions * 100, 2) if initial_sessions > 0 else 0
                
                return {
                    "funnel_id": funnel_id,
                    "funnel_name": funnel.name,
                    "period_days": days,
                    "steps": step_results,
                    "total_started": step_results[0]["sessions"] if step_results else 0,
                    "total_completed": step_results[-1]["sessions"] if step_results else 0,
                    "overall_conversion_rate": round(
                        step_results[-1]["sessions"] / step_results[0]["sessions"] * 100, 2
                    ) if step_results and step_results[0]["sessions"] > 0 else 0
                }
        except Exception as e:
            logger.error(f"Failed to get funnel analytics: {e}")
            return {"error": str(e)}
    
    def get_utm_performance(self, days: int = 30) -> Dict[str, List[Dict]]:
        """Get performance metrics broken down by UTM parameters."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # By source
                cursor.execute("""
                    SELECT 
                        utm_source,
                        COUNT(*) as sessions,
                        COUNT(DISTINCT CASE WHEN event_type = 'conversion' THEN session_id END) as conversions,
                        SUM(CASE WHEN event_type = 'conversion' THEN conversion_value ELSE 0 END) as revenue
                    FROM analytics_events
                    WHERE timestamp >= ? AND utm_source IS NOT NULL
                    GROUP BY utm_source
                    ORDER BY sessions DESC
                    LIMIT 10
                """, (start_date,))
                
                by_source = [
                    {
                        "source": row[0],
                        "sessions": row[1],
                        "conversions": row[2],
                        "conversion_rate": round(row[2] / row[1] * 100, 2) if row[1] > 0 else 0,
                        "revenue": round(row[3], 2)
                    }
                    for row in cursor.fetchall()
                ]
                
                # By campaign
                cursor.execute("""
                    SELECT 
                        utm_campaign,
                        COUNT(*) as sessions,
                        COUNT(DISTINCT CASE WHEN event_type = 'conversion' THEN session_id END) as conversions,
                        SUM(CASE WHEN event_type = 'conversion' THEN conversion_value ELSE 0 END) as revenue
                    FROM analytics_events
                    WHERE timestamp >= ? AND utm_campaign IS NOT NULL
                    GROUP BY utm_campaign
                    ORDER BY sessions DESC
                    LIMIT 10
                """, (start_date,))
                
                by_campaign = [
                    {
                        "campaign": row[0],
                        "sessions": row[1],
                        "conversions": row[2],
                        "conversion_rate": round(row[2] / row[1] * 100, 2) if row[1] > 0 else 0,
                        "revenue": round(row[3], 2)
                    }
                    for row in cursor.fetchall()
                ]
                
                return {
                    "by_source": by_source,
                    "by_campaign": by_campaign
                }
        except Exception as e:
            logger.error(f"Failed to get UTM performance: {e}")
            return {"by_source": [], "by_campaign": []}
    
    def create_conversion_goal(self, goal: ConversionGoal) -> bool:
        """Create a new conversion goal."""
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO conversion_goals (id, name, description, event_type, value, url_pattern, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (goal.id, goal.name, goal.description, goal.event_type, goal.value, goal.url_pattern, goal.is_active))
                
                conn.commit()
                self.conversion_goals[goal.id] = goal
                return True
        except Exception as e:
            logger.error(f"Failed to create conversion goal: {e}")
            return False
    
    def get_realtime_stats(self, minutes: int = 30) -> Dict[str, Any]:
        """Get real-time statistics for the last N minutes."""
        start_time = datetime.utcnow() - timedelta(minutes=minutes)
        
        try:
            with self.get_db() as conn:
                cursor = conn.cursor()
                
                # Active sessions
                cursor.execute("""
                    SELECT COUNT(DISTINCT session_id)
                    FROM analytics_events
                    WHERE timestamp >= ?
                """, (start_time,))
                active_sessions = cursor.fetchone()[0] or 0
                
                # Page views
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM analytics_events
                    WHERE timestamp >= ? AND event_type = 'pageview'
                """, (start_time,))
                pageviews = cursor.fetchone()[0] or 0
                
                # Clicks
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM analytics_events
                    WHERE timestamp >= ? AND event_type = 'click'
                """, (start_time,))
                clicks = cursor.fetchone()[0] or 0
                
                # Conversions
                cursor.execute("""
                    SELECT COUNT(*), SUM(conversion_value)
                    FROM analytics_events
                    WHERE timestamp >= ? AND event_type = 'conversion'
                """, (start_time,))
                row = cursor.fetchone()
                conversions = row[0] or 0
                revenue = row[1] or 0
                
                # Top pages
                cursor.execute("""
                    SELECT url, COUNT(*) as views
                    FROM analytics_events
                    WHERE timestamp >= ? AND event_type = 'pageview' AND url IS NOT NULL
                    GROUP BY url
                    ORDER BY views DESC
                    LIMIT 5
                """, (start_time,))
                top_pages = [{"url": row[0], "views": row[1]} for row in cursor.fetchall()]
                
                return {
                    "period_minutes": minutes,
                    "active_sessions": active_sessions,
                    "pageviews": pageviews,
                    "clicks": clicks,
                    "conversions": conversions,
                    "revenue": round(revenue, 2),
                    "top_pages": top_pages
                }
        except Exception as e:
            logger.error(f"Failed to get realtime stats: {e}")
            return {
                "period_minutes": minutes,
                "active_sessions": 0,
                "pageviews": 0,
                "clicks": 0,
                "conversions": 0,
                "revenue": 0,
                "top_pages": []
            }


# Helper function to extract UTM parameters from URL
def extract_utm_params(url: str) -> Dict[str, Optional[str]]:
    """Extract UTM parameters from a URL."""
    from urllib.parse import urlparse, parse_qs
    
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        return {
            "utm_source": params.get("utm_source", [None])[0],
            "utm_medium": params.get("utm_medium", [None])[0],
            "utm_campaign": params.get("utm_campaign", [None])[0],
            "utm_content": params.get("utm_content", [None])[0],
            "utm_term": params.get("utm_term", [None])[0],
        }
    except Exception:
        return {
            "utm_source": None,
            "utm_medium": None,
            "utm_campaign": None,
            "utm_content": None,
            "utm_term": None,
        }

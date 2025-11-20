from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class ItemCreate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    price: Optional[str] = None
    target_datetime: Optional[str] = None
    name: Optional[str] = None
    text: Optional[str] = None
    email: Optional[EmailStr] = None
    grid_columns: Optional[int] = 2 # NEU: Spaltenanzahl

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[int] = None
    is_featured: Optional[bool] = None
    is_affiliate: Optional[bool] = None
    publish_on: Optional[str] = None
    expires_on: Optional[str] = None
    price: Optional[str] = None
    grid_columns: Optional[int] = None # NEU

class Item(BaseModel):
    id: int
    item_type: str
    title: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int
    parent_id: Optional[int] = None
    click_count: int 
    is_featured: bool = False
    is_active: bool = True
    is_affiliate: bool = False
    publish_on: Optional[str] = None
    expires_on: Optional[str] = None
    price: Optional[str] = None
    grid_columns: int = 2 # NEU (Default 2)
    children: List['Item'] = []

Item.model_rebuild()

# ... (Rest bleibt unverändert: Settings, AnalyticsData, etc.) ...
class Settings(BaseModel):
    title: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    bg_image_url: Optional[str] = None
    social_youtube: Optional[str] = None
    social_instagram: Optional[str] = None
    social_tiktok: Optional[str] = None
    social_twitch: Optional[str] = None
    social_x: Optional[str] = None
    social_discord: Optional[str] = None
    social_email: Optional[str] = None
    theme: Optional[str] = None
    button_style: Optional[str] = None
    custom_bg_color: Optional[str] = None
    custom_text_color: Optional[str] = None
    custom_button_color: Optional[str] = None
    custom_button_text_color: Optional[str] = None
    custom_html_head: Optional[str] = None
    custom_html_body: Optional[str] = None

class AnalyticsData(BaseModel):
    total_clicks: int
    clicks_per_day: List[Dict[str, Any]]
    top_links: List[Dict[str, Any]]
    top_referers: List[Dict[str, Any]]
    top_countries: List[Dict[str, Any]]
    total_subscribers: int

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str
    privacy_agreed: bool

class Message(BaseModel):
    id: int
    name: str
    email: str
    message: str
    sent_at: datetime

class SubscribeRequest(BaseModel):
    email: EmailStr
    privacy_agreed: bool

class Subscriber(BaseModel):
    id: int
    email: str
    subscribed_at: datetime

class ReorderRequest(BaseModel):
    ids: List[int]

class ImageUploadResponse(BaseModel):
    url: str

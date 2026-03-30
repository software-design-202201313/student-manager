from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    message: str
    is_read: bool
    related_id: str | None = None
    related_type: str | None = None
    created_at: datetime


class NotificationPreferenceUpdate(BaseModel):
    grade_input: bool | None = None
    feedback_created: bool | None = None
    counseling_updated: bool | None = None

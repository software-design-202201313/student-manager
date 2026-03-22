from datetime import datetime

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    student_id: str
    category: str = Field(pattern=r"^(score|behavior|attendance|attitude)$")
    content: str = Field(min_length=1)
    is_visible_to_student: bool = False
    is_visible_to_parent: bool = False


class FeedbackResponse(BaseModel):
    id: str
    student_id: str
    teacher_id: str
    category: str
    content: str
    is_visible_to_student: bool
    is_visible_to_parent: bool
    created_at: datetime


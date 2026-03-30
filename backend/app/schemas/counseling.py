from datetime import date, datetime

from pydantic import BaseModel


class CounselingCreate(BaseModel):
    student_id: str
    date: date
    content: str
    next_plan: str | None = None
    is_shared: bool = True


class CounselingResponse(BaseModel):
    id: str
    student_id: str
    teacher_id: str
    student_name: str | None = None
    teacher_name: str | None = None
    date: date
    content: str
    next_plan: str | None
    is_shared: bool
    created_at: datetime

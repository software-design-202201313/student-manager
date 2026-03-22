from datetime import datetime

from pydantic import BaseModel, Field


class SpecialNoteCreate(BaseModel):
    content: str = Field(min_length=1)


class SpecialNoteResponse(BaseModel):
    id: str
    student_id: str
    content: str
    created_by: str
    created_at: datetime
    updated_at: datetime


from datetime import date

from pydantic import BaseModel, Field


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None)
    student_number: int | None = Field(default=None, ge=1, le=100)
    birth_date: date | None = None


class StudentDetail(BaseModel):
    id: str
    user_id: str
    class_id: str
    name: str
    student_number: int
    birth_date: date | None


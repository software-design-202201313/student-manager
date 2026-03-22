from datetime import date

from pydantic import BaseModel, Field


class AttendanceCreate(BaseModel):
    date: date
    status: str = Field(pattern=r"^(present|absent|late|early_leave)$")
    note: str | None = None


class AttendanceResponse(BaseModel):
    id: str
    student_id: str
    date: date
    status: str
    note: str | None


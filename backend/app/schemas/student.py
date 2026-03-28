from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class StudentDirectCreate(BaseModel):
    """교사가 폼/엑셀에서 직접 학생을 등록할 때 사용. 이메일 입력 불필요."""
    name: str = Field(min_length=1, max_length=100)
    student_number: int = Field(ge=1, le=100)
    birth_date: date | None = None
    gender: Literal["male", "female"] | None = None
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None)
    student_number: int | None = Field(default=None, ge=1, le=100)
    birth_date: date | None = None
    gender: Literal["male", "female"] | None = None
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)


class StudentDetail(BaseModel):
    id: str
    user_id: str
    class_id: str
    name: str
    student_number: int
    birth_date: date | None
    gender: Literal["male", "female"] | None
    phone: str | None
    address: str | None

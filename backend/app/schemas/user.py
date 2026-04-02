from datetime import date

from pydantic import BaseModel, EmailStr, Field


class StudentCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    class_id: str
    student_number: int = Field(ge=1, le=100)
    birth_date: date | None = None


class ParentCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1)
    student_id: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class OnboardingResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    account_status: str
    invite_url: str | None = None
    invite_expires_at: str | None = None


class StudentResponse(BaseModel):
    id: str
    user_id: str
    class_id: str
    student_number: int
    name: str


class StudentCreateResponse(BaseModel):
    id: str
    user_id: str
    class_id: str
    student_number: int
    name: str
    email: EmailStr
    account_status: str
    invite_url: str | None = None
    invite_expires_at: str | None = None

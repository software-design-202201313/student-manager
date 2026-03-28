from decimal import Decimal

from pydantic import BaseModel, Field


class GradeCreate(BaseModel):
    student_id: str
    subject_id: str
    semester_id: str
    score: Decimal = Field(ge=0, le=100)


class GradeResponse(BaseModel):
    id: str
    student_id: str
    subject_id: str
    semester_id: str
    score: Decimal | None
    grade_rank: int | None


class GradeSummaryResponse(BaseModel):
    total_score: float | None
    average_score: float | None
    subject_count: int
    grades: list[GradeResponse]

from pydantic import BaseModel, Field


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    grade: int = Field(ge=1, le=12)
    year: int = Field(ge=1900, le=3000)


class ClassResponse(BaseModel):
    id: str
    name: str
    grade: int
    year: int


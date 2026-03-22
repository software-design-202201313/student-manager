from pydantic import BaseModel, Field


class SemesterCreate(BaseModel):
    year: int = Field(ge=1900, le=3000)
    term: int = Field(ge=1, le=2)


class SemesterResponse(BaseModel):
    id: str
    year: int
    term: int


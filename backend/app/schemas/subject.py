from pydantic import BaseModel, Field


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class SubjectResponse(BaseModel):
    id: str
    class_id: str
    name: str


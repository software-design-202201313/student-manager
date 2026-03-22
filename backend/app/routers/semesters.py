from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.main import AppException
from app.models.semester import Semester
from app.schemas.semester import SemesterCreate, SemesterResponse

router = APIRouter(prefix="/semesters", tags=["semesters"]) 


@router.post("", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
async def create_semester(
    body: SemesterCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_role("teacher")),
):
    semester = Semester(year=body.year, term=body.term)
    db.add(semester)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppException(409, "Semester already exists", "SEMESTER_DUPLICATE")
    await db.refresh(semester)
    return SemesterResponse(id=str(semester.id), year=semester.year, term=semester.term)


@router.get("", response_model=list[SemesterResponse])
async def list_semesters(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_role("teacher")),
):
    result = await db.execute(select(Semester).order_by(Semester.year.desc(), Semester.term.desc()))
    items = result.scalars().all()
    return [SemesterResponse(id=str(s.id), year=s.year, term=s.term) for s in items]


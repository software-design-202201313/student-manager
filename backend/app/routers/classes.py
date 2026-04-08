import uuid

from fastapi import APIRouter, Depends, status, Query, Request
from sqlalchemy import select, delete, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.errors import AppException
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.special_note import SpecialNote
from app.models.feedback import Feedback
from app.models.counseling import Counseling
from app.models.parent_student import ParentStudent
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import User
from app.schemas.class_ import ClassCreate, ClassResponse
from app.schemas.student import StudentDirectCreate, StudentDetail
from app.schemas.subject import SubjectCreate, SubjectResponse
from app.services.student import create_student as create_student_service

router = APIRouter(prefix="/classes", tags=["classes"]) 


@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    body: ClassCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    cls = Class(
        school_id=current_user.school_id,
        name=body.name,
        grade=body.grade,
        year=body.year,
        teacher_id=current_user.id,
    )
    db.add(cls)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppException(400, "Invalid class data", "CLASS_INVALID")
    await db.refresh(cls)
    return ClassResponse(id=str(cls.id), name=cls.name, grade=cls.grade, year=cls.year)


@router.get("", response_model=list[ClassResponse])
async def list_classes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    result = await db.execute(
        select(Class).where(Class.teacher_id == current_user.id).order_by(Class.year.desc())
    )
    classes = result.scalars().all()
    return [ClassResponse(id=str(c.id), name=c.name, grade=c.grade, year=c.year) for c in classes]


def _ensure_class_owner(cls: Class, current_user: User):
    if cls.teacher_id != current_user.id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")


@router.post("/{class_id}/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    class_id: str,
    body: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    result = await db.execute(select(Class).where(Class.id == uuid.UUID(class_id)))
    cls = result.scalar_one_or_none()
    if cls is None:
        raise AppException(404, "Class not found", "CLASS_NOT_FOUND")
    _ensure_class_owner(cls, current_user)
    subj = Subject(class_id=cls.id, name=body.name)
    db.add(subj)
    await db.commit()
    await db.refresh(subj)
    return SubjectResponse(id=str(subj.id), class_id=str(subj.class_id), name=subj.name)


@router.get("/{class_id}/subjects", response_model=list[SubjectResponse])
async def list_subjects(
    class_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    result = await db.execute(select(Class).where(Class.id == uuid.UUID(class_id)))
    cls = result.scalar_one_or_none()
    if cls is None:
        raise AppException(404, "Class not found", "CLASS_NOT_FOUND")
    _ensure_class_owner(cls, current_user)
    result = await db.execute(select(Subject).where(Subject.class_id == cls.id))
    subjects = result.scalars().all()
    return [SubjectResponse(id=str(s.id), class_id=str(s.class_id), name=s.name) for s in subjects]


@router.delete("/{class_id}/subjects/{subject_id}", status_code=204)
async def delete_subject(
    class_id: str,
    subject_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    # Verify class ownership
    result = await db.execute(select(Class).where(Class.id == uuid.UUID(class_id)))
    cls = result.scalar_one_or_none()
    if cls is None:
        raise AppException(404, "Class not found", "CLASS_NOT_FOUND")
    _ensure_class_owner(cls, current_user)

    # Check subject exists
    result = await db.execute(select(Subject).where(Subject.id == uuid.UUID(subject_id)))
    subj = result.scalar_one_or_none()
    if subj is None or subj.class_id != cls.id:
        raise AppException(404, "Subject not found", "SUBJECT_NOT_FOUND")

    # Prevent deletion if grades exist
    result = await db.execute(select(Grade).where(Grade.subject_id == subj.id))
    if result.first() is not None:
        raise AppException(409, "Subject has grades", "SUBJECT_HAS_GRADES")

    await db.delete(subj)
    await db.commit()


@router.post("/{class_id}/students", response_model=StudentDetail, status_code=status.HTTP_201_CREATED)
async def create_student(
    class_id: str,
    body: StudentDirectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    student, user, _, _ = await create_student_service(
        db,
        class_id=uuid.UUID(class_id),
        teacher_id=current_user.id,
        school_id=current_user.school_id,
        email=str(body.email),
        name=body.name,
        student_number=body.student_number,
        birth_date=body.birth_date,
        gender=body.gender,
        phone=body.phone,
        address=body.address,
    )
    return StudentDetail(
        id=str(student.id),
        user_id=str(user.id),
        class_id=str(student.class_id),
        email=user.email,
        name=user.name,
        account_status="pending_invite",
        student_number=student.student_number,
        birth_date=student.birth_date,
        gender=student.gender,
        phone=student.phone,
        address=student.address,
    )


@router.delete("/{class_id}", status_code=204)
async def delete_class(
    request: Request,
    class_id: str,
    force: bool = Query(default=False, description="데이터가 있어도 강제 삭제"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    # Verify class ownership
    result = await db.execute(select(Class).where(Class.id == uuid.UUID(class_id)))
    cls = result.scalar_one_or_none()
    if cls is None:
        raise AppException(404, "Class not found", "CLASS_NOT_FOUND")
    _ensure_class_owner(cls, current_user)

    # Check related data
    students_result = await db.execute(select(Student.id).where(Student.class_id == cls.id))
    student_ids = [row[0] for row in students_result.all()]
    subjects_result = await db.execute(select(Subject.id).where(Subject.class_id == cls.id))
    subject_ids = [row[0] for row in subjects_result.all()]

    # Defensive: also honor raw query param in case of parsing edge-cases
    raw_force = request.query_params.get("force")
    if isinstance(raw_force, str) and raw_force.lower() in {"1", "true", "yes"}:
        force = True

    if not force:
        if student_ids:
            raise AppException(409, "Class has students", "CLASS_NOT_EMPTY")
        if subject_ids:
            raise AppException(409, "Class has subjects", "CLASS_NOT_EMPTY")

    # Force delete path: remove dependent rows first, then students/subjects, then class
    if force:
        # Grades tied to these students or subjects
        grade_filters = []
        if student_ids:
            grade_filters.append(Grade.student_id.in_(student_ids))
        if subject_ids:
            grade_filters.append(Grade.subject_id.in_(subject_ids))
        if grade_filters:
            await db.execute(delete(Grade).where(or_(*grade_filters)))

        # Attendance, SpecialNote, Feedback, Counseling, ParentStudent for students
        if student_ids:
            await db.execute(delete(Attendance).where(Attendance.student_id.in_(student_ids)))
            await db.execute(delete(SpecialNote).where(SpecialNote.student_id.in_(student_ids)))
            await db.execute(delete(Feedback).where(Feedback.student_id.in_(student_ids)))
            await db.execute(delete(Counseling).where(Counseling.student_id.in_(student_ids)))
            await db.execute(delete(ParentStudent).where(ParentStudent.student_id.in_(student_ids)))

        # Subjects and Students
        if subject_ids:
            await db.execute(delete(Subject).where(Subject.id.in_(subject_ids)))
        if student_ids:
            await db.execute(delete(Student).where(Student.id.in_(student_ids)))

    await db.delete(cls)
    await db.commit()

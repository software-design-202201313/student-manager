import uuid
from typing import List, Tuple

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppException
from app.services.auth import issue_invitation
from app.services.auth_delivery import build_frontend_auth_link, deliver_auth_link
from app.models.class_ import Class
from app.models.parent_student import ParentStudent
from app.models.student import Student
from app.models.user import User
from app.models.user_invitation import UserInvitation
from app.schemas.user import ParentCreate, StudentCreate
from app.utils.security import generate_opaque_token, hash_password


def _pending_password_hash() -> str:
    return hash_password(generate_opaque_token())


async def create_student_account(
    db: AsyncSession,
    *,
    school_id: uuid.UUID,
    teacher_id: uuid.UUID,
    data: StudentCreate,
) -> Tuple[User, Student, UserInvitation, str]:
    # Ensure class belongs to the same school
    result = await db.execute(select(Class).where(Class.id == uuid.UUID(data.class_id)))
    cls = result.scalar_one_or_none()
    if cls is None or cls.school_id != school_id:
        raise AppException(404, "Class not found", "CLASS_NOT_FOUND")
    if cls.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    existing_student = await db.execute(
        select(Student).where(Student.class_id == cls.id, Student.student_number == data.student_number)
    )
    if existing_student.scalar_one_or_none() is not None:
        raise AppException(409, "해당 번호의 학생이 이미 존재합니다.", "STUDENT_DUPLICATE_NUMBER")

    user = User(
        school_id=school_id,
        email=str(data.email),
        hashed_password=_pending_password_hash(),
        role="student",
        name=data.name,
        is_active=False,
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise AppException(409, "이미 사용 중인 이메일입니다.", "USER_DUPLICATE_EMAIL")

    student = Student(
        user_id=user.id,
        class_id=cls.id,
        student_number=data.student_number,
        birth_date=data.birth_date,
    )
    db.add(student)
    invitation, raw_token = await issue_invitation(db, user=user, invited_by=teacher_id)
    await db.commit()
    await db.refresh(user)
    await db.refresh(student)
    await db.refresh(invitation)
    link = build_frontend_auth_link("/signup", raw_token)
    await deliver_auth_link(kind="invitation", recipient_email=user.email, link=link)
    return user, student, invitation, link


async def create_parent_account(
    db: AsyncSession,
    *,
    teacher_id: uuid.UUID,
    school_id: uuid.UUID,
    data: ParentCreate,
) -> Tuple[User, ParentStudent, UserInvitation, str]:
    # validate student exists and same school
    result = await db.execute(
        select(Student, User, Class)
        .join(User, Student.user_id == User.id)
        .join(Class, Student.class_id == Class.id)
        .where(Student.id == uuid.UUID(data.student_id))
    )
    row = result.first()
    if row is None:
        raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
    student, student_user, cls = row
    if student_user.school_id != school_id:
        raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
    if cls.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    parent = User(
        school_id=school_id,
        email=str(data.email),
        hashed_password=_pending_password_hash(),
        role="parent",
        name=data.name,
        is_active=False,
    )
    db.add(parent)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise AppException(409, "이미 사용 중인 이메일입니다.", "USER_DUPLICATE_EMAIL")

    link = ParentStudent(parent_id=parent.id, student_id=student.id)
    db.add(link)
    invitation, raw_token = await issue_invitation(db, user=parent, invited_by=teacher_id)
    await db.commit()
    await db.refresh(parent)
    await db.refresh(link)
    await db.refresh(invitation)
    signup_link = build_frontend_auth_link("/signup", raw_token)
    await deliver_auth_link(kind="invitation", recipient_email=parent.email, link=signup_link)
    return parent, link, invitation, signup_link


async def list_students(
    db: AsyncSession,
    *,
    teacher_id: uuid.UUID,
    class_id: uuid.UUID | None,
) -> List[tuple[Student, User]]:
    # Only list students of teacher's classes
    class_query = select(Class.id).where(Class.teacher_id == teacher_id)
    if class_id is not None:
        class_query = class_query.where(Class.id == class_id)

    result = await db.execute(
        select(Student, User)
        .join(User, Student.user_id == User.id)
        .where(Student.class_id.in_(class_query))
        .order_by(Student.student_number)
    )
    return result.all()


async def deactivate_student(db: AsyncSession, *, student_id: uuid.UUID, teacher_id: uuid.UUID):
    result = await db.execute(select(Student, User, Class).join(User, Student.user_id == User.id).join(Class, Student.class_id == Class.id).where(Student.id == student_id))
    row = result.first()
    if row is None:
        raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
    student, user, cls = row
    if cls.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    user.is_active = False
    await db.commit()

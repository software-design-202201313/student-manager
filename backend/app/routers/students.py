import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.attendance import AttendanceCreate, AttendanceResponse
from app.schemas.special_note import SpecialNoteCreate, SpecialNoteResponse
from app.schemas.student import StudentDetail, StudentUpdate
from app.services.student import (
    create_attendance,
    create_special_note,
    get_student_detail,
    list_attendance,
    list_special_notes,
    update_attendance,
    update_special_note,
    update_student,
)

router = APIRouter(prefix="/students", tags=["students"]) 


@router.get("/{student_id}", response_model=StudentDetail)
async def get_student_endpoint(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    student, user = await get_student_detail(db, student_id=uuid.UUID(student_id), teacher_id=current_user.id)
    return StudentDetail(
        id=str(student.id),
        user_id=str(user.id),
        class_id=str(student.class_id),
        name=user.name,
        student_number=student.student_number,
        birth_date=student.birth_date,
    )


@router.put("/{student_id}", response_model=StudentDetail)
async def update_student_endpoint(
    student_id: str,
    body: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    student, user = await update_student(
        db,
        student_id=uuid.UUID(student_id),
        teacher_id=current_user.id,
        name=body.name,
        student_number=body.student_number,
        birth_date=body.birth_date,
    )
    return StudentDetail(
        id=str(student.id),
        user_id=str(user.id),
        class_id=str(student.class_id),
        name=user.name,
        student_number=student.student_number,
        birth_date=student.birth_date,
    )


@router.post("/{student_id}/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def create_attendance_endpoint(
    student_id: str,
    body: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    att = await create_attendance(
        db,
        student_id=uuid.UUID(student_id),
        teacher_id=current_user.id,
        date_=body.date,
        status=body.status,
        note=body.note,
    )
    return AttendanceResponse(
        id=str(att.id), student_id=str(att.student_id), date=att.date, status=att.status, note=att.note
    )


@router.get("/{student_id}/attendance", response_model=list[AttendanceResponse])
async def list_attendance_endpoint(
    student_id: str,
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    rows = await list_attendance(
        db,
        student_id=uuid.UUID(student_id),
        teacher_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )
    return [
        AttendanceResponse(id=str(att.id), student_id=str(att.student_id), date=att.date, status=att.status, note=att.note)
        for att in rows
    ]


@router.put("/{student_id}/attendance/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance_endpoint(
    student_id: str, attendance_id: str, body: AttendanceCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role("teacher"))
):
    att = await update_attendance(
        db,
        attendance_id=uuid.UUID(attendance_id),
        teacher_id=current_user.id,
        status=body.status,
        note=body.note,
    )
    return AttendanceResponse(id=str(att.id), student_id=str(att.student_id), date=att.date, status=att.status, note=att.note)


@router.post("/{student_id}/special-notes", response_model=SpecialNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_special_note_endpoint(
    student_id: str, body: SpecialNoteCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role("teacher"))
):
    note = await create_special_note(
        db,
        student_id=uuid.UUID(student_id),
        teacher_id=current_user.id,
        content=body.content,
    )
    return SpecialNoteResponse(
        id=str(note.id),
        student_id=str(note.student_id),
        content=note.content,
        created_by=str(note.created_by),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.put("/{student_id}/special-notes/{note_id}", response_model=SpecialNoteResponse)
async def update_special_note_endpoint(
    student_id: str, note_id: str, body: SpecialNoteCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role("teacher"))
):
    note = await update_special_note(db, note_id=uuid.UUID(note_id), teacher_id=current_user.id, content=body.content)
    return SpecialNoteResponse(
        id=str(note.id),
        student_id=str(note.student_id),
        content=note.content,
        created_by=str(note.created_by),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("/{student_id}/special-notes", response_model=list[SpecialNoteResponse])
async def list_special_notes_endpoint(
    student_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role("teacher"))
):
    rows = await list_special_notes(db, student_id=uuid.UUID(student_id), teacher_id=current_user.id)
    return [
        SpecialNoteResponse(
            id=str(note.id),
            student_id=str(note.student_id),
            content=note.content,
            created_by=str(note.created_by),
            created_at=note.created_at,
            updated_at=note.updated_at,
        )
        for note in rows
    ]


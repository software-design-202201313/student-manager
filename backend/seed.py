import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, Base, engine
from app.models import School, User
from app.utils.security import hash_password


async def seed() -> None:
    # Create tables (dev/test convenience; in prod use Alembic migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:  # type: AsyncSession
        # Seed a default school and teacher if not present
        result = await session.execute(select(School).limit(1))
        school = result.scalar_one_or_none()
        if school is None:
            school = School(name="Demo School")
            session.add(school)
            await session.flush()

        result = await session.execute(select(User).where(User.email == "teacher@example.com"))
        teacher = result.scalar_one_or_none()
        if teacher is None:
            teacher = User(
                school_id=school.id,
                email="teacher@example.com",
                hashed_password=hash_password("password123"),
                role="teacher",
                name="교사",
            )
            session.add(teacher)

        await session.commit()
        print("Seed complete:", {"school": school.name, "teacher": teacher.email})


if __name__ == "main":
    asyncio.run(seed())


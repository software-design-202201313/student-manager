from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://localhost:5432/student_manager"
    test_database_url: str = "sqlite+aiosqlite:///./test.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 7
    # Allow both localhost and 127.0.0.1 for Vite dev server to avoid CORS
    # preflight failures (DELETE/PUT) when the dev host differs.
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    # Cookie settings for refresh token
    cookie_secure: bool = False
    cookie_samesite: str = "lax"  # one of: "lax", "strict", "none"

    model_config = {"env_file": ".env"}


settings = Settings()

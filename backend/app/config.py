from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://localhost:5432/student_manager"
    test_database_url: str = "sqlite+aiosqlite:///./test.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    invite_token_expire_hours: int = 72
    password_reset_token_expire_minutes: int = 60
    app_base_url: str = "http://localhost:5173"
    auth_link_delivery: str = "stub"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: float = 10.0
    # Allow both localhost and 127.0.0.1 for Vite dev server to avoid CORS
    # preflight failures (DELETE/PUT) when the dev host differs.
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    # Cookie settings for refresh token
    refresh_cookie_name: str = "refresh_token"
    cookie_secure: bool = False
    cookie_samesite: str = "strict"  # one of: "lax", "strict", "none"
    cookie_path: str = "/"

    model_config = {"env_file": ".env"}


settings = Settings()

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    # Allow dev/test emails with reserved domains (e.g., placeholder.local)
    # Using plain str avoids EmailStr rejecting special-use domains.
    email: str
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    name: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    school_id: str


class InvitationPreviewResponse(BaseModel):
    email: str
    name: str
    role: str
    expires_at: str


class InvitationAcceptRequest(BaseModel):
    token: str = Field(min_length=8)
    password: str = Field(min_length=8, max_length=128)


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordRecoveryResponse(BaseModel):
    accepted: bool = True
    delivery: str
    preview_url: str | None = None


class PasswordResetRequest(BaseModel):
    token: str = Field(min_length=8)
    password: str = Field(min_length=8, max_length=128)

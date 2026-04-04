import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

from app.config import settings


@dataclass
class AuthDeliveryResult:
    delivery: str
    preview_url: str | None = None


def build_frontend_auth_link(path: str, token: str) -> str:
    return f"{settings.app_base_url.rstrip('/')}{path}?token={token}"


def _build_email(kind: str, recipient_email: str, link: str) -> EmailMessage:
    subject_map = {
        "invitation": "Student Manager 초대 링크",
        "password-recovery": "Student Manager 비밀번호 재설정 링크",
    }
    subject = subject_map.get(kind, "Student Manager 링크")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email or settings.smtp_username or "no-reply@localhost"
    message["To"] = recipient_email
    message.set_content(
        "\n".join(
            [
                "Student Manager에서 링크를 보냈습니다.",
                "",
                f"유형: {kind}",
                f"링크: {link}",
                "",
                "이 링크가 예상과 다르면 무시하세요.",
            ]
        )
    )
    return message


def _deliver_via_smtp(*, kind: str, recipient_email: str, link: str) -> None:
    if not settings.smtp_host:
        raise RuntimeError("SMTP delivery requested but smtp_host is not configured")

    email = _build_email(kind, recipient_email, link)
    smtp_factory = smtplib.SMTP_SSL if settings.smtp_use_ssl else smtplib.SMTP
    context = ssl.create_default_context()

    smtp_kwargs = {"timeout": settings.smtp_timeout_seconds}
    if settings.smtp_use_ssl:
        smtp_kwargs["context"] = context

    with smtp_factory(settings.smtp_host, settings.smtp_port, **smtp_kwargs) as smtp:
        if settings.smtp_use_tls and not settings.smtp_use_ssl:
            smtp.starttls(context=context)
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password or "")
        smtp.send_message(email)


async def deliver_auth_link(*, kind: str, recipient_email: str, link: str) -> AuthDeliveryResult:
    delivery = settings.auth_link_delivery.lower()
    if delivery == "stub":
        return AuthDeliveryResult(delivery="stub", preview_url=link)

    if delivery == "smtp":
        _deliver_via_smtp(kind=kind, recipient_email=recipient_email, link=link)
        return AuthDeliveryResult(delivery="smtp", preview_url=None)

    print(f"[{kind}] send link to {recipient_email}: {link}")
    return AuthDeliveryResult(delivery=delivery or "log", preview_url=None)

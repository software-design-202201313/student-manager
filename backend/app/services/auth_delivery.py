from dataclasses import dataclass

from app.config import settings


@dataclass
class AuthDeliveryResult:
    delivery: str
    preview_url: str | None = None


def build_frontend_auth_link(path: str, token: str) -> str:
    return f"{settings.app_base_url.rstrip('/')}{path}?token={token}"


async def deliver_auth_link(*, kind: str, recipient_email: str, link: str) -> AuthDeliveryResult:
    delivery = settings.auth_link_delivery.lower()
    if delivery == "stub":
        return AuthDeliveryResult(delivery="stub", preview_url=link)

    print(f"[{kind}] send link to {recipient_email}: {link}")
    return AuthDeliveryResult(delivery=delivery or "log", preview_url=None)

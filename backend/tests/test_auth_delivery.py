from __future__ import annotations

import smtplib

import pytest

from app.config import settings
from app.services.auth_delivery import deliver_auth_link


@pytest.mark.asyncio
async def test_stub_delivery_returns_preview_url(monkeypatch):
    monkeypatch.setattr(settings, "auth_link_delivery", "stub")

    result = await deliver_auth_link(
        kind="invitation",
        recipient_email="student@example.com",
        link="http://localhost:5173/signup?token=test-token",
    )

    assert result.delivery == "stub"
    assert result.preview_url == "http://localhost:5173/signup?token=test-token"


@pytest.mark.asyncio
async def test_smtp_delivery_sends_message(monkeypatch):
    monkeypatch.setattr(settings, "auth_link_delivery", "smtp")
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_port", 2525)
    monkeypatch.setattr(settings, "smtp_username", "mailer")
    monkeypatch.setattr(settings, "smtp_password", "secret")
    monkeypatch.setattr(settings, "smtp_from_email", "noreply@example.com")
    monkeypatch.setattr(settings, "smtp_use_tls", True)
    monkeypatch.setattr(settings, "smtp_use_ssl", False)
    monkeypatch.setattr(settings, "smtp_timeout_seconds", 3.0)

    calls: dict[str, object] = {}

    class DummySMTP:
        def __init__(self, host, port, timeout=None, context=None):
            calls["host"] = host
            calls["port"] = port
            calls["timeout"] = timeout
            calls["context"] = context
            calls["starttls"] = False
            calls["login"] = None
            calls["message"] = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self, context=None):
            calls["starttls"] = context is not None

        def login(self, username, password):
            calls["login"] = (username, password)

        def send_message(self, message):
            calls["message"] = message

    monkeypatch.setattr(smtplib, "SMTP", DummySMTP)

    result = await deliver_auth_link(
        kind="password-recovery",
        recipient_email="parent@example.com",
        link="http://localhost:5173/forgot-password?token=test-token",
    )

    assert result.delivery == "smtp"
    assert result.preview_url is None
    assert calls["host"] == "smtp.example.com"
    assert calls["port"] == 2525
    assert calls["timeout"] == 3.0
    assert calls["starttls"] is True
    assert calls["login"] == ("mailer", "secret")
    assert calls["message"]["To"] == "parent@example.com"
    assert "비밀번호 재설정" in calls["message"]["Subject"]
    assert "test-token" in calls["message"].get_content()

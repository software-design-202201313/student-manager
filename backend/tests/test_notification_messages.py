from app.services.notification import (
    build_counseling_notification_message,
    build_feedback_notification_message,
    build_grade_notification_message,
)


def test_build_grade_notification_message_cleans_generated_suffixes():
    message = build_grade_notification_message(
        "학생-notify-1774877221554-vqgxos",
        "수학-notify-1774877221554-vqgxos",
    )

    assert message == "학생 · 수학 성적이 저장되었어요."


def test_build_feedback_notification_message_uses_category_label():
    message = build_feedback_notification_message(
        "홍길동",
        "attendance",
    )

    assert message == "홍길동 · 출결 피드백이 등록되었어요."


def test_build_counseling_notification_message_uses_fallback_name():
    message = build_counseling_notification_message(None)

    assert message == "학생 · 상담 기록이 업데이트되었어요."

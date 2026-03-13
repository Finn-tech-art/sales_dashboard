from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base, import_models
from backend.services.outreach import process_hubspot_contact


def build_session():
    import_models()
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return SessionLocal()


def test_process_hubspot_contact_creates_log() -> None:
    db = build_session()
    payload = b'{"contact":{"email":"lead@example.com","firstName":"Ada","company":"Bizard"}}'

    with patch("backend.domains.leads.services.outreach_service.OpenAIClient") as openai_cls, patch(
        "backend.domains.leads.services.outreach_service.EmailSender"
    ) as email_cls:
        openai_cls.return_value.generate_outreach_email.return_value = ("Hello", "Body")
        email_cls.return_value.send_email.return_value = {"success": True, "provider_message_id": "msg-1"}
        log = process_hubspot_contact(db, payload)

    assert log is not None
    assert log.subject == "Hello"
    assert log.status == "sent"

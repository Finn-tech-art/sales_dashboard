from unittest.mock import Mock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base, import_models
from backend.workers.lead_sourcing import sync_leads


def build_session():
    import_models()
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return SessionLocal()


def test_sync_leads_imports_new_records_and_skips_duplicates() -> None:
    db = build_session()
    fake_discovery = Mock()
    fake_discovery.fetch_leads.return_value = [
        {"external_id": "1", "email": None, "phone": None, "first_name": "One", "last_name": "A", "company": "A Co", "company_domain": "aco.example", "linkedin_url": "https://linkedin.com/in/one", "title": "CEO", "industry": "Tech", "source": "linkedin_google", "status": "discovered"},
        {"external_id": "1", "email": None, "phone": None, "first_name": "One", "last_name": "A", "company": "A Co", "company_domain": "aco.example", "linkedin_url": "https://linkedin.com/in/one", "title": "CEO", "industry": "Tech", "source": "linkedin_google", "status": "discovered"},
    ]
    fake_hunter = Mock()
    fake_hunter.find_email.return_value = {"email": "one@example.com"}
    fake_hubspot = Mock()

    with patch("backend.domains.leads.services.lead_service.LeadDiscoveryClient", return_value=fake_discovery), patch(
        "backend.domains.leads.services.lead_service.HunterClient", return_value=fake_hunter
    ), patch(
        "backend.domains.leads.services.lead_service.HubSpotClient", return_value=fake_hubspot
    ):
        result = sync_leads(db, query="test", user_id=1, limit=10)

    assert result == {"imported": 1, "skipped": 1, "enriched": 1}

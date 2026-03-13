from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base
from backend.models.lead import Lead
from backend.models.outreach_logs import OutreachLog
from backend.models.support_logs import SupportLog
from backend.models.workflow_run import WorkflowRun
from backend.workers.reporting import build_report_metrics


def build_session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return SessionLocal()


def test_build_report_metrics_counts_seed_data() -> None:
    db = build_session()
    db.add(Lead(email="lead@example.com", source="linkedin_google", status="new"))
    db.add(OutreachLog(status="sent", channel="email"))
    db.add(SupportLog(status="responded"))
    db.add(WorkflowRun(workflow_name="weekly-report", trigger_source="scheduler", status="completed"))
    db.commit()

    metrics = build_report_metrics(db)

    assert metrics["total_leads"] == 1
    assert metrics["outreach_sent"] == 1
    assert metrics["support_responses"] == 1
    assert metrics["successful_workflows"] == 1

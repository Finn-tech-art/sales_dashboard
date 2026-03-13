import json
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.database import session_scope
from backend.models.lead import Lead
from backend.models.outreach_logs import OutreachLog
from backend.models.support_logs import SupportLog
from backend.models.workflow_run import WorkflowRun
from backend.services.email_sender import EmailSender
from backend.services.openai_client import OpenAIClient
from backend.workers.celery_app import celery_app


def _record_run(db: Session, user_id: int | None, status: str, payload: dict, error: str | None = None) -> WorkflowRun:
    run = WorkflowRun(
        workflow_name="weekly-report",
        user_id=user_id,
        trigger_source="scheduler",
        status=status,
        payload=json.dumps(payload),
        error_message=error,
        completed_at=datetime.utcnow() if status != "running" else None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def build_report_metrics(db: Session, user_id: int | None = None) -> dict:
    lead_scope = Lead.user_id.is_(None) if user_id is None else or_(Lead.user_id == user_id, Lead.user_id.is_(None))
    outreach_scope = (
        OutreachLog.user_id.is_(None)
        if user_id is None
        else or_(OutreachLog.user_id == user_id, OutreachLog.user_id.is_(None))
    )
    support_scope = (
        SupportLog.user_id.is_(None)
        if user_id is None
        else or_(SupportLog.user_id == user_id, SupportLog.user_id.is_(None))
    )
    workflow_scope = (
        WorkflowRun.user_id.is_(None)
        if user_id is None
        else or_(WorkflowRun.user_id == user_id, WorkflowRun.user_id.is_(None))
    )
    return {
        "total_leads": db.scalar(select(func.count(Lead.id)).where(lead_scope)) or 0,
        "outreach_sent": db.scalar(select(func.count(OutreachLog.id)).where(outreach_scope)) or 0,
        "support_responses": db.scalar(select(func.count(SupportLog.id)).where(support_scope)) or 0,
        "successful_workflows": db.scalar(
            select(func.count(WorkflowRun.id)).where(workflow_scope, WorkflowRun.status == "completed")
        ) or 0,
    }


def generate_weekly_report(db: Session, user_id: int | None = None) -> dict:
    metrics = build_report_metrics(db, user_id=user_id)
    _record_run(db, user_id=user_id, status="running", payload=metrics)
    try:
        summary = OpenAIClient().generate_weekly_report(metrics)
        EmailSender().send_email(
            to=get_settings().REPORT_RECIPIENT_EMAIL,
            subject="Bizard Leads Weekly Report",
            body=summary,
        )
        _record_run(db, user_id=user_id, status="completed", payload={**metrics, "summary": summary})
        return {"metrics": metrics, "summary": summary}
    except Exception as exc:
        _record_run(db, user_id=user_id, status="failed", payload=metrics, error=str(exc))
        raise


@celery_app.task(name="backend.workers.reporting.generate_weekly_report")
def generate_weekly_report_task(user_id: int | None = None) -> dict:
    with session_scope() as db:
        return generate_weekly_report(db, user_id=user_id)

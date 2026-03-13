from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.core.cache import CacheBackend, build_cache_key
from backend.domains.leads.models.lead import Lead
from backend.domains.leads.models.outreach_log import OutreachLog
from backend.domains.leads.models.support_log import SupportLog
from backend.models.workflow_run import WorkflowRun


def build_lead_metrics(db: Session, user_id: int | None = None) -> dict:
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
            select(func.count(WorkflowRun.id)).where(
                workflow_scope,
                WorkflowRun.status == "completed",
                WorkflowRun.domain == "leads",
            )
        )
        or 0,
    }


def get_cached_lead_dashboard(db: Session, user_id: int | None = None) -> dict:
    cache = CacheBackend()
    key = build_cache_key("dashboard", "leads", user_id or "global")
    return cache.remember(key, lambda: build_lead_metrics(db, user_id=user_id))

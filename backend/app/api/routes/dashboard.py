from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user
from backend.app.database import get_db
from backend.models.lead import Lead
from backend.models.outreach_logs import OutreachLog
from backend.models.support_logs import SupportLog
from backend.models.user import User
from backend.models.workflow_run import WorkflowRun


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    lead_scope = or_(Lead.user_id == current_user.id, Lead.user_id.is_(None))
    outreach_scope = or_(OutreachLog.user_id == current_user.id, OutreachLog.user_id.is_(None))
    support_scope = or_(SupportLog.user_id == current_user.id, SupportLog.user_id.is_(None))
    workflow_scope = or_(WorkflowRun.user_id == current_user.id, WorkflowRun.user_id.is_(None))

    total_leads = db.scalar(select(func.count(Lead.id)).where(lead_scope)) or 0
    outreach_sent = db.scalar(select(func.count(OutreachLog.id)).where(outreach_scope)) or 0
    support_responses = db.scalar(select(func.count(SupportLog.id)).where(support_scope)) or 0
    successful_workflows = db.scalar(
        select(func.count(WorkflowRun.id)).where(workflow_scope, WorkflowRun.status == "completed")
    ) or 0
    recent_workflows = db.scalars(
        select(WorkflowRun).where(workflow_scope).order_by(WorkflowRun.started_at.desc()).limit(5)
    ).all()

    return {
        "kpis": {
            "total_leads": total_leads,
            "outreach_sent": outreach_sent,
            "support_responses": support_responses,
            "successful_workflows": successful_workflows,
        },
        "recent_workflows": [
            {
                "id": run.id,
                "workflow_name": run.workflow_name,
                "status": run.status,
                "started_at": run.started_at.isoformat(),
            }
            for run in recent_workflows
        ],
    }

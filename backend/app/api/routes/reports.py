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


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/")
def get_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return {
        "totals": {
            "leads": db.scalar(
                select(func.count(Lead.id)).where(or_(Lead.user_id == current_user.id, Lead.user_id.is_(None)))
            ) or 0,
            "outreach": db.scalar(
                select(func.count(OutreachLog.id)).where(
                    or_(OutreachLog.user_id == current_user.id, OutreachLog.user_id.is_(None))
                )
            ) or 0,
            "support": db.scalar(
                select(func.count(SupportLog.id)).where(
                    or_(SupportLog.user_id == current_user.id, SupportLog.user_id.is_(None))
                )
            ) or 0,
        },
        "recent_reports": [
            {
                "id": run.id,
                "status": run.status,
                "started_at": run.started_at.isoformat(),
                "completed_at": run.completed_at.isoformat() if run.completed_at else None,
                "payload": run.payload,
            }
            for run in db.scalars(
                select(WorkflowRun)
                .where(
                    or_(WorkflowRun.user_id == current_user.id, WorkflowRun.user_id.is_(None)),
                    WorkflowRun.workflow_name == "weekly-report",
                )
                .order_by(WorkflowRun.started_at.desc())
                .limit(10)
            ).all()
        ],
    }

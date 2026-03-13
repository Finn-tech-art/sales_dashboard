from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user
from backend.app.database import get_db
from backend.models.user import User
from backend.models.workflow_run import WorkflowRun
from backend.workers.lead_sourcing import source_leads_task
from backend.workers.reporting import generate_weekly_report_task
from backend.workers.support import support_followup_task


router = APIRouter(prefix="/workflows", tags=["workflows"])


WORKFLOW_TASKS = {
    "lead-sourcing": source_leads_task,
    "weekly-report": generate_weekly_report_task,
    "support-followup": support_followup_task,
}


@router.get("/")
def list_workflows(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    recent_runs = db.scalars(
        select(WorkflowRun)
        .where(or_(WorkflowRun.user_id == current_user.id, WorkflowRun.user_id.is_(None)))
        .order_by(WorkflowRun.started_at.desc())
        .limit(20)
    ).all()
    return {
        "available": list(WORKFLOW_TASKS.keys()),
        "recent_runs": [
            {
                "id": run.id,
                "workflow_name": run.workflow_name,
                "status": run.status,
                "started_at": run.started_at.isoformat(),
            }
            for run in recent_runs
        ],
    }


@router.post("/{workflow_name}/run", status_code=status.HTTP_202_ACCEPTED)
def run_workflow(workflow_name: str, current_user: User = Depends(get_current_user)) -> dict:
    task = WORKFLOW_TASKS.get(workflow_name)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown workflow")
    task.delay(user_id=current_user.id)
    return {"workflow_name": workflow_name, "status": "queued"}

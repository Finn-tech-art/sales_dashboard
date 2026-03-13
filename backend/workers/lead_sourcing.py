import json
from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.database import session_scope
from backend.models.lead import Lead
from backend.models.workflow_run import WorkflowRun
from backend.services.hunter import HunterClient
from backend.services.hubspot import HubSpotClient
from backend.services.lead_discovery import LeadDiscoveryClient
from backend.workers.celery_app import celery_app


def _create_workflow_run(db: Session, workflow_name: str, user_id: int | None, payload: dict | None = None) -> WorkflowRun:
    run = WorkflowRun(
        workflow_name=workflow_name,
        user_id=user_id,
        trigger_source="worker",
        status="running",
        payload=json.dumps(payload or {}),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def sync_leads(db: Session, query: str, user_id: int | None = None, limit: int = 25) -> dict:
    run = _create_workflow_run(db, "lead-sourcing", user_id=user_id, payload={"query": query, "limit": limit})
    imported = 0
    skipped = 0
    enriched = 0
    try:
        discovery = LeadDiscoveryClient()
        hunter = HunterClient()
        hubspot = HubSpotClient()
        for candidate in discovery.fetch_leads(query=query, per_page=limit):
            duplicate = db.scalar(
                select(Lead).where(
                    or_(
                        Lead.email == candidate.get("email"),
                        Lead.phone == candidate.get("phone"),
                        Lead.external_id == candidate.get("external_id"),
                    )
                )
            )
            if duplicate is not None:
                skipped += 1
                continue

            if not candidate.get("email") and candidate.get("company_domain"):
                email_result = hunter.find_email(
                    first_name=candidate.get("first_name"),
                    last_name=candidate.get("last_name"),
                    domain=candidate.get("company_domain"),
                    company=candidate.get("company"),
                )
                if email_result.get("email"):
                    candidate["email"] = email_result["email"]
                    enriched += 1

            lead = Lead(user_id=user_id, **candidate)
            db.add(lead)
            db.commit()
            db.refresh(lead)
            imported += 1

            if lead.email:
                hubspot.create_or_update_contact(
                    {
                        "email": lead.email,
                        "firstname": lead.first_name,
                        "lastname": lead.last_name,
                        "company": lead.company,
                        "website": lead.company_domain,
                        "jobtitle": lead.title,
                        "linkedinbio": lead.linkedin_url,
                    }
                )

        run.status = "completed"
        run.payload = json.dumps({"query": query, "limit": limit, "imported": imported, "skipped": skipped, "enriched": enriched})
        run.completed_at = datetime.utcnow()
        db.add(run)
        db.commit()
        return {"imported": imported, "skipped": skipped, "enriched": enriched}
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)
        run.completed_at = datetime.utcnow()
        db.add(run)
        db.commit()
        raise


@celery_app.task(name="backend.workers.lead_sourcing.source_leads")
def source_leads_task(query: str | None = None, limit: int = 25, user_id: int | None = None) -> dict:
    settings = get_settings()
    with session_scope() as db:
        return sync_leads(db, query=query or settings.DEFAULT_LEAD_QUERY, user_id=user_id, limit=limit)

import json
from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.core.cache import CacheBackend, build_cache_key
from backend.domains.leads.models.lead import Lead
from backend.models.workflow_run import WorkflowRun
from backend.schemas.lead import LeadCreate
from backend.services.hubspot import HubSpotClient
from backend.services.hunter import HunterClient
from backend.services.lead_discovery import LeadDiscoveryClient


def create_workflow_run(
    db: Session,
    *,
    workflow_name: str,
    domain: str,
    trigger_source: str,
    user_id: int | None,
    payload: dict | None = None,
) -> WorkflowRun:
    run = WorkflowRun(
        workflow_name=workflow_name,
        domain=domain,
        user_id=user_id,
        trigger_source=trigger_source,
        status="running",
        payload=json.dumps(payload or {}),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def list_leads_for_user(db: Session, user_id: int, status_filter: str | None = None, limit: int = 50) -> list[Lead]:
    query = (
        select(Lead)
        .where(or_(Lead.user_id == user_id, Lead.user_id.is_(None)))
        .order_by(Lead.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        query = query.where(Lead.status == status_filter)
    return list(db.scalars(query).all())


def create_lead_record(db: Session, user_id: int, lead_in: LeadCreate) -> Lead:
    lead = Lead(user_id=user_id, **lead_in.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    CacheBackend().delete(build_cache_key("dashboard", "leads", user_id))
    return lead


def sync_discovered_leads(db: Session, query: str, user_id: int | None = None, limit: int = 25) -> dict:
    run = create_workflow_run(
        db,
        workflow_name="lead-sourcing",
        domain="leads",
        trigger_source="worker",
        user_id=user_id,
        payload={"query": query, "limit": limit},
    )
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
        run.payload = json.dumps(
            {
                "query": query,
                "limit": limit,
                "imported": imported,
                "skipped": skipped,
                "enriched": enriched,
            }
        )
        run.completed_at = datetime.utcnow()
        db.add(run)
        db.commit()
        CacheBackend().delete(build_cache_key("dashboard", "leads", user_id or "global"))
        return {"imported": imported, "skipped": skipped, "enriched": enriched}
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)
        run.completed_at = datetime.utcnow()
        db.add(run)
        db.commit()
        raise

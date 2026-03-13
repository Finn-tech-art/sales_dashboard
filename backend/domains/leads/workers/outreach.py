from backend.app.database import session_scope
from backend.domains.leads.services.outreach_service import process_hubspot_contact
from backend.workers.celery_app import celery_app


@celery_app.task(name="backend.domains.leads.workers.outreach.process_hubspot_contact")
def process_hubspot_contact_task(payload: str) -> dict:
    with session_scope() as db:
        result = process_hubspot_contact(db, payload.encode("utf-8"))
        return {"status": "processed", "log_id": result.id if result else None}

from backend.app.config import get_settings
from backend.app.database import session_scope
from backend.domains.leads.services.lead_service import sync_discovered_leads
from backend.workers.celery_app import celery_app


def sync_leads(db, query: str, user_id: int | None = None, limit: int = 25) -> dict:
    return sync_discovered_leads(db, query=query, user_id=user_id, limit=limit)


@celery_app.task(name="backend.domains.leads.workers.lead_sourcing.source_leads")
def source_leads_task(query: str | None = None, limit: int = 25, user_id: int | None = None) -> dict:
    settings = get_settings()
    with session_scope() as db:
        return sync_discovered_leads(db, query=query or settings.DEFAULT_LEAD_QUERY, user_id=user_id, limit=limit)

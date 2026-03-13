from backend.services.n8n_client import N8NClient
from backend.workers.lead_sourcing import source_leads_task
from backend.workers.reporting import generate_weekly_report_task


def trigger_lead_sourcing_via_n8n(query: str) -> dict:
    return N8NClient().trigger_workflow("leads", {"query": query})


def trigger_weekly_report_via_n8n() -> dict:
    return N8NClient().trigger_workflow("weekly-report", {})


WORKFLOW_DISPATCH = {
    "lead-sourcing": source_leads_task,
    "weekly-report": generate_weekly_report_task,
}

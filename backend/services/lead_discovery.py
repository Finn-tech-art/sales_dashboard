from typing import Any

from backend.app.config import get_settings
from backend.services.n8n_client import N8NClient


class LeadDiscoveryClient:
    """n8n-backed lead discovery adapter for LinkedIn / Google search workflows."""

    def __init__(self, n8n_client: N8NClient | None = None):
        self.settings = get_settings()
        self.n8n_client = n8n_client or N8NClient()

    def search_people(self, query: str, page: int = 1, per_page: int = 25) -> dict[str, Any]:
        return self.n8n_client.trigger_workflow(
            self.settings.LEAD_DISCOVERY_WEBHOOK_PATH,
            {"query": query, "page": page, "per_page": per_page},
        )

    def fetch_leads(self, query: str, page: int = 1, per_page: int = 25) -> list[dict[str, Any]]:
        response = self.search_people(query=query, page=page, per_page=per_page)
        leads = response.get("results") or response.get("people") or response.get("leads") or []
        return [self.normalize_person(lead) for lead in leads]

    @staticmethod
    def normalize_person(person: dict[str, Any]) -> dict[str, Any]:
        company = person.get("company")
        if isinstance(company, dict):
            company_name = company.get("name")
            company_domain = company.get("domain")
        else:
            company_name = company
            company_domain = person.get("domain")

        return {
            "external_id": person.get("id") or person.get("profile_url"),
            "email": person.get("email"),
            "phone": person.get("phone"),
            "first_name": person.get("first_name") or person.get("firstName"),
            "last_name": person.get("last_name") or person.get("lastName"),
            "company": company_name,
            "company_domain": company_domain,
            "linkedin_url": person.get("linkedin_url") or person.get("profile_url"),
            "title": person.get("title") or person.get("job_title"),
            "industry": person.get("industry"),
            "source": "linkedin_google",
            "status": "discovered",
        }

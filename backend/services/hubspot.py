from typing import Any

import httpx

from backend.app.config import get_settings
from backend.services import ExternalServiceError, ServiceConfigurationError


class HubSpotClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        http_client: httpx.Client | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.HUBSPOT_API_KEY
        self.base_url = (base_url or settings.HUBSPOT_BASE_URL).rstrip("/")
        self.client = http_client or httpx.Client(timeout=30)

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ServiceConfigurationError("HUBSPOT_API_KEY is not configured")
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def get_contacts(self, limit: int = 100) -> dict[str, Any]:
        response = self.client.get(
            f"{self.base_url}/crm/v3/objects/contacts",
            headers=self._headers(),
            params={"limit": limit},
        )
        if response.is_error:
            raise ExternalServiceError(f"HubSpot contact fetch failed: {response.text}")
        return response.json()

    def create_contact(self, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.client.post(
            f"{self.base_url}/crm/v3/objects/contacts",
            headers=self._headers(),
            json={"properties": properties},
        )
        if response.is_error:
            raise ExternalServiceError(f"HubSpot contact create failed: {response.text}")
        return response.json()

    def update_contact(self, contact_id: str, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.client.patch(
            f"{self.base_url}/crm/v3/objects/contacts/{contact_id}",
            headers=self._headers(),
            json={"properties": properties},
        )
        if response.is_error:
            raise ExternalServiceError(f"HubSpot contact update failed: {response.text}")
        return response.json()

    def create_or_update_contact(self, properties: dict[str, Any]) -> dict[str, Any]:
        email = properties.get("email")
        if not email:
            return {"skipped": True, "reason": "missing_email"}
        return self.create_contact(properties)

from typing import Any

import httpx

from backend.app.config import get_settings
from backend.services import ExternalServiceError, ServiceConfigurationError


class N8NClient:
    def __init__(self, base_url: str | None = None, http_client: httpx.Client | None = None):
        settings = get_settings()
        self.base_url = (base_url or settings.N8N_WEBHOOK_BASE).rstrip("/")
        self.client = http_client or httpx.Client(timeout=15)

    def trigger_workflow(self, webhook_path: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.base_url:
            raise ServiceConfigurationError("N8N_WEBHOOK_BASE is not configured")
        response = self.client.post(f"{self.base_url}/{webhook_path.lstrip('/')}", json=payload)
        if response.is_error:
            raise ExternalServiceError(f"n8n workflow trigger failed: {response.text}")
        try:
            return response.json()
        except ValueError:
            return {"status": "accepted", "body": response.text}

from typing import Any

import httpx

from backend.app.config import get_settings
from backend.services import ExternalServiceError, ServiceConfigurationError


class HunterClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        http_client: httpx.Client | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.HUNTER_API_KEY
        self.base_url = (base_url or settings.HUNTER_BASE_URL).rstrip("/")
        self.client = http_client or httpx.Client(timeout=20)

    def _params(self, **extra: Any) -> dict[str, Any]:
        if not self.api_key:
            raise ServiceConfigurationError("HUNTER_API_KEY is not configured")
        return {"api_key": self.api_key, **extra}

    def find_email(
        self,
        *,
        first_name: str | None = None,
        last_name: str | None = None,
        domain: str | None = None,
        company: str | None = None,
    ) -> dict[str, Any]:
        response = self.client.get(
            f"{self.base_url}/email-finder",
            params=self._params(
                first_name=first_name,
                last_name=last_name,
                domain=domain,
                company=company,
            ),
        )
        if response.is_error:
            raise ExternalServiceError(f"Hunter email finder failed: {response.text}")
        return response.json().get("data", {})

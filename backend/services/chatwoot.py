from typing import Any

import httpx

from backend.app.config import get_settings
from backend.services import ExternalServiceError, ServiceConfigurationError


class ChatwootClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        http_client: httpx.Client | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.CHATWOOT_API_KEY
        self.base_url = (base_url or settings.CHATWOOT_BASE_URL).rstrip("/")
        self.client = http_client or httpx.Client(timeout=30)

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ServiceConfigurationError("CHATWOOT_API_KEY is not configured")
        return {
            "api_access_token": self.api_key,
            "Content-Type": "application/json",
        }

    def send_message(self, account_id: int, conversation_id: int, message: str) -> dict[str, Any]:
        response = self.client.post(
            f"{self.base_url}/accounts/{account_id}/conversations/{conversation_id}/messages",
            headers=self._headers(),
            json={"content": message, "message_type": "outgoing"},
        )
        if response.is_error:
            raise ExternalServiceError(f"Chatwoot send failed: {response.text}")
        return response.json()

    def get_conversation(self, account_id: int, conversation_id: int) -> dict[str, Any]:
        response = self.client.get(
            f"{self.base_url}/accounts/{account_id}/conversations/{conversation_id}",
            headers=self._headers(),
        )
        if response.is_error:
            raise ExternalServiceError(f"Chatwoot get conversation failed: {response.text}")
        return response.json()

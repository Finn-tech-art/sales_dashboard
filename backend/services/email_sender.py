from typing import Any

from backend.app.config import get_settings
from backend.services import ServiceConfigurationError
from backend.services.n8n_client import N8NClient


class EmailSender:
    """Mailmeteor-backed email sender.

    Delivery is delegated to n8n so the backend stays decoupled from Mailmeteor's
    exact automation surface.
    """

    def __init__(
        self,
        api_key: str | None = None,
        default_from: str | None = None,
        n8n_client: N8NClient | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key or settings.MAILMETEOR_API_KEY
        self.default_from = default_from or settings.EMAIL_FROM
        self.n8n_client = n8n_client or N8NClient()
        self.webhook_path = settings.MAILMETEOR_WEBHOOK_PATH

    def send_email(self, to: str, subject: str, body: str) -> dict[str, Any]:
        if not self.webhook_path:
            raise ServiceConfigurationError("MAILMETEOR_WEBHOOK_PATH is not configured")

        response = self.n8n_client.trigger_workflow(
            self.webhook_path,
            {
                "provider": "mailmeteor",
                "api_key": self.api_key,
                "from": self.default_from,
                "to": to,
                "subject": subject,
                "body": body,
            },
        )

        provider_message_id = response.get("id") or response.get("message_id")
        return {
            "success": response.get("success", True),
            "status_code": response.get("status_code", 202),
            "provider_message_id": provider_message_id,
        }

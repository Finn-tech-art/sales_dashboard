from typing import Any

from openai import OpenAI

from backend.app.config import get_settings
from backend.services import ServiceConfigurationError


class OpenAIClient:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        if not self.api_key:
            raise ServiceConfigurationError("OPENAI_API_KEY is not configured")
        if self._client is None:
            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def _complete(self, prompt: str, max_tokens: int = 400) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You help Bizard Leads automate outreach, support, and reporting."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        return (response.choices[0].message.content or "").strip()

    def generate_outreach_email(self, contact: dict[str, Any]) -> tuple[str, str]:
        prompt = (
            "Write a concise B2B outreach email.\n"
            f"Name: {contact.get('first_name') or contact.get('firstName') or ''}\n"
            f"Company: {contact.get('company') or ''}\n"
            f"Title: {contact.get('title') or contact.get('jobtitle') or ''}\n"
            "Return the first line as 'SUBJECT: ...' and the rest as the email body."
        )
        content = self._complete(prompt, max_tokens=300)
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        subject = "Bizard Leads outreach"
        body_lines: list[str] = []
        for line in lines:
            if line.upper().startswith("SUBJECT:"):
                subject = line.split(":", 1)[1].strip() or subject
            else:
                body_lines.append(line)
        return subject, "\n".join(body_lines).strip()

    def generate_support_response(self, conversation: str, user_message: str) -> str:
        prompt = (
            "Respond as Bizard Leads support.\n"
            f"Conversation history: {conversation}\n"
            f"Latest user message: {user_message}\n"
            "Keep it helpful, short, and action-oriented."
        )
        return self._complete(prompt, max_tokens=220)

    def generate_weekly_report(self, metrics: dict[str, Any]) -> str:
        prompt = (
            "Create a weekly business summary for Bizard Leads.\n"
            f"Metrics: {metrics}\n"
            "Highlight wins, risks, and one recommendation."
        )
        return self._complete(prompt, max_tokens=500)

    def generate_social_post(self, topic: str, platform: str, context: str = "") -> tuple[str, str, str]:
        prompt = (
            "Create a short-form social media post for Bizard Leads.\n"
            f"Topic: {topic}\n"
            f"Platform: {platform}\n"
            f"Context: {context}\n"
            "Return three sections labeled TITLE:, CAPTION:, and CONTENT:."
        )
        content = self._complete(prompt, max_tokens=350)
        title = f"{platform.title()} post"
        caption = topic
        body = content
        for line in content.splitlines():
            clean = line.strip()
            if clean.upper().startswith("TITLE:"):
                title = clean.split(":", 1)[1].strip() or title
            elif clean.upper().startswith("CAPTION:"):
                caption = clean.split(":", 1)[1].strip() or caption
            elif clean.upper().startswith("CONTENT:"):
                body = clean.split(":", 1)[1].strip() or body
        return title, caption, body

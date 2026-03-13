from backend.services.openai_client import OpenAIClient


class FakeOpenAIClient(OpenAIClient):
    def _complete(self, prompt: str, max_tokens: int = 400) -> str:
        return "SUBJECT: Hello there\nThis is the email body."


def test_generate_outreach_email_parses_subject_and_body() -> None:
    client = FakeOpenAIClient(api_key="test-key")

    subject, body = client.generate_outreach_email({"first_name": "Ada"})

    assert subject == "Hello there"
    assert body == "This is the email body."

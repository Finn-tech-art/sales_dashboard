from unittest.mock import Mock

from backend.services.n8n_client import N8NClient


def test_trigger_workflow_returns_json_payload() -> None:
    response = Mock()
    response.is_error = False
    response.json.return_value = {"status": "ok"}

    http_client = Mock()
    http_client.post.return_value = response

    client = N8NClient(base_url="https://n8n.example.com/webhook", http_client=http_client)

    result = client.trigger_workflow("leads", {"query": "smb"})

    assert result == {"status": "ok"}
    http_client.post.assert_called_once()

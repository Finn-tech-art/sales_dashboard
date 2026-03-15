from fastapi.testclient import TestClient

from backend.app.api.routes import webhooks
from backend.app.main import create_app


def test_hubspot_webhook_queues_dispatch(monkeypatch) -> None:
    captured: dict[str, str] = {}

    def fake_delay(payload: str):
        captured["payload"] = payload

    monkeypatch.setattr(webhooks.dispatch_hubspot_webhook_task, "delay", fake_delay)
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_CLIENT_SECRET", "shared-secret")
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_WEBHOOK_SHARED_HEADER_NAME", "X-Bizard-Webhook-Secret")

    app = create_app()
    client = TestClient(app)
    payload = [{"subscriptionType": "contact.creation", "objectId": 123}]

    response = client.post(
        "/api/webhooks/hubspot",
        json=payload,
        headers={"X-Bizard-Webhook-Secret": "shared-secret"},
    )

    assert response.status_code == 202
    assert captured["payload"] == '[{"subscriptionType": "contact.creation", "objectId": 123}]'


def test_hubspot_webhook_rejects_invalid_shared_secret(monkeypatch) -> None:
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_CLIENT_SECRET", "shared-secret")
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_WEBHOOK_SHARED_HEADER_NAME", "X-Bizard-Webhook-Secret")

    app = create_app()
    client = TestClient(app)

    response = client.post(
        "/api/webhooks/hubspot",
        json=[{"subscriptionType": "contact.creation", "objectId": 123}],
        headers={"X-Bizard-Webhook-Secret": "wrong-secret"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid webhook credentials"


def test_hubspot_webhook_rejects_payload_without_supported_events(monkeypatch) -> None:
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_CLIENT_SECRET", "shared-secret")
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_WEBHOOK_SHARED_HEADER_NAME", "X-Bizard-Webhook-Secret")

    app = create_app()
    client = TestClient(app)

    response = client.post(
        "/api/webhooks/hubspot",
        json={"events": [{"eventType": "contact.updated"}]},
        headers={"X-Bizard-Webhook-Secret": "shared-secret"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid HubSpot webhook payload"

import time

from fastapi.testclient import TestClient

from backend.app.api.routes import webhooks
from backend.app.api.routes.webhooks import build_hubspot_signature_v3, verify_hubspot_signature_v3
from backend.app.main import create_app


def test_verify_hubspot_signature_v3_accepts_matching_signature() -> None:
    payload = b'{"eventId":1}'
    timestamp = str(int(time.time() * 1000))
    uri = "https://example.com/api/webhooks/hubspot"
    secret = "client-secret"
    signature = build_hubspot_signature_v3(
        client_secret=secret,
        method="POST",
        uri=uri,
        body=payload,
        timestamp=timestamp,
    )

    assert verify_hubspot_signature_v3(
        signature=signature,
        payload=payload,
        client_secret=secret,
        method="POST",
        uri=uri,
        timestamp=timestamp,
    )


def test_hubspot_webhook_queues_dispatch(monkeypatch) -> None:
    captured: dict[str, str] = {}

    def fake_delay(payload: str):
        captured["payload"] = payload

    monkeypatch.setattr(webhooks.dispatch_hubspot_webhook_task, "delay", fake_delay)
    monkeypatch.setattr(webhooks.settings, "HUBSPOT_CLIENT_SECRET", "client-secret")

    app = create_app()
    client = TestClient(app)
    payload = b'[{"subscriptionType":"contact.creation","objectId":123}]'
    timestamp = str(int(time.time() * 1000))
    signature = build_hubspot_signature_v3(
        client_secret="client-secret",
        method="POST",
        uri="http://testserver/api/webhooks/hubspot",
        body=payload,
        timestamp=timestamp,
    )

    response = client.post(
        "/api/webhooks/hubspot",
        data=payload,
        headers={
            "X-HubSpot-Signature-v3": signature,
            "X-HubSpot-Request-Timestamp": timestamp,
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == 202
    assert captured["payload"] == payload.decode("utf-8")

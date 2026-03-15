import json
from datetime import UTC, datetime

import httpx

from backend.services.hubspot import HubSpotClient


def test_create_or_update_contact_skips_missing_email() -> None:
    client = HubSpotClient(access_token="test-token")

    result = client.create_or_update_contact({"firstname": "Ada"})

    assert result["skipped"] is True
    assert result["reason"] == "missing_email"


def test_create_or_update_contact_updates_existing_contact_by_email() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-token"
        if request.method == "PATCH":
            assert request.url.params["idProperty"] == "email"
            payload = json.loads(request.content.decode("utf-8"))
            return httpx.Response(200, json={"id": "123", "properties": payload["properties"]})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport, base_url="https://api.hubapi.com")
    client = HubSpotClient(access_token="test-token", http_client=http_client)

    result = client.create_or_update_contact({"email": "ada@example.com", "firstname": "Ada"})

    assert result["id"] == "123"


def test_batch_upsert_contacts_builds_email_id_payload() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content.decode("utf-8"))
        assert request.method == "POST"
        assert payload["inputs"][0]["id"] == "ada@example.com"
        assert payload["inputs"][0]["idProperty"] == "email"
        return httpx.Response(200, json={"status": "COMPLETE", "results": payload["inputs"]})

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport, base_url="https://api.hubapi.com")
    client = HubSpotClient(access_token="test-token", http_client=http_client)

    result = client.batch_upsert_contacts([{"email": "ada@example.com", "firstname": "Ada"}])

    assert result["status"] == "COMPLETE"


def test_list_contacts_sends_incremental_sync_parameters() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.params["limit"] == "50"
        assert request.url.params["after"] == "cursor-1"
        assert request.url.params["updatedAfter"] == "2026-03-15T09:00:00Z"
        return httpx.Response(200, json={"results": []})

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport, base_url="https://api.hubapi.com")
    client = HubSpotClient(access_token="test-token", http_client=http_client)

    client.list_contacts(limit=50, after="cursor-1", updated_after=datetime(2026, 3, 15, 9, 0, tzinfo=UTC))

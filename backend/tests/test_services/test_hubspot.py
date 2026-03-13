from backend.services.hubspot import HubSpotClient


def test_create_or_update_contact_skips_missing_email() -> None:
    client = HubSpotClient(api_key="test-token")

    result = client.create_or_update_contact({"firstname": "Ada"})

    assert result["skipped"] is True
    assert result["reason"] == "missing_email"

from backend.services.hubspot_dashboard import (
    get_hubspot_leads_payload,
    get_hubspot_metrics_payload,
    get_hubspot_opportunities_payload,
    get_hubspot_sales_payload,
    get_hubspot_tasks_payload,
)


class FakeHubSpotClient:
    def get_contacts(self, limit: int = 100):
        return {
            "results": [
                {
                    "id": "1",
                    "properties": {
                        "firstname": "Ada",
                        "lastname": "Lovelace",
                        "email": "ada@example.com",
                        "company": "Analytical Engines",
                        "lifecyclestage": "lead",
                        "createdate": "2026-03-14T10:00:00Z",
                    },
                },
                {
                    "id": "2",
                    "properties": {
                        "firstname": "Grace",
                        "lastname": "Hopper",
                        "email": "grace@example.com",
                        "company": "Compiler Labs",
                        "lifecyclestage": "salesqualifiedlead",
                        "createdate": "2026-03-13T10:00:00Z",
                    },
                },
            ]
        }

    def get_deals(self, limit: int = 100):
        return {
            "results": [
                {
                    "id": "deal-1",
                    "properties": {
                        "dealname": "Enterprise Expansion",
                        "amount": "5000",
                        "dealstage": "closedwon",
                        "closedate": "2026-03-14T12:00:00Z",
                    },
                },
                {
                    "id": "deal-2",
                    "properties": {
                        "dealname": "Renewal Risk",
                        "amount": "1200",
                        "dealstage": "closedlost",
                        "closedate": "2026-03-13T12:00:00Z",
                    },
                },
            ]
        }


def test_hubspot_dashboard_payloads_shape_data() -> None:
    client = FakeHubSpotClient()

    metrics = get_hubspot_metrics_payload(user_id=1, client=client)
    leads = get_hubspot_leads_payload(user_id=1, client=client)
    opportunities = get_hubspot_opportunities_payload(user_id=1, client=client)
    sales = get_hubspot_sales_payload(user_id=1, client=client)
    tasks = get_hubspot_tasks_payload(user_id=1, client=client)

    assert metrics["cards"][0]["label"] == "Total Leads"
    assert leads["items"][0]["name"] == "Ada Lovelace"
    assert "New" in leads["status_breakdown"]
    assert len(opportunities["labels"]) == 7
    assert len(sales["revenue"]) == 7
    assert len(tasks["items"]) == 3

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from backend.app.core.cache import CacheBackend, build_cache_key
from backend.services.hubspot import HubSpotClient


DEMO_METRICS_PAYLOAD = {
    "cards": [
        {"key": "total_leads", "label": "Total Leads", "value": 1842, "change": "+12% This Week", "trend": [140, 165, 182, 190, 210, 228, 246]},
        {"key": "total_opportunities", "label": "Total Opportunities", "value": 146, "change": "+9% This Week", "trend": [12, 15, 18, 17, 20, 23, 26]},
        {"key": "total_sales", "label": "Total Sales", "value": 84250, "change": "+17% This Week", "trend": [8200, 9100, 10600, 9800, 12500, 14800, 19250]},
    ]
}

DEMO_LEADS_PAYLOAD = {
    "items": [
        {"id": "demo-1", "name": "Amina Limo", "email": "amina@northpeak.co", "company": "Northpeak Studio", "avatar": "AL", "stage": "New", "created_at": "2026-03-15T08:00:00+00:00"},
        {"id": "demo-2", "name": "James Mworia", "email": "james@blueorbit.io", "company": "Blue Orbit", "avatar": "JM", "stage": "Qualified", "created_at": "2026-03-15T07:20:00+00:00"},
        {"id": "demo-3", "name": "Sofia Kimani", "email": "sofia@fieldlane.com", "company": "Fieldlane", "avatar": "SK", "stage": "Contacted", "created_at": "2026-03-15T06:40:00+00:00"},
        {"id": "demo-4", "name": "Theo Njoroge", "email": "theo@acelytics.ai", "company": "Acelytics", "avatar": "TN", "stage": "Closed", "created_at": "2026-03-15T06:00:00+00:00"},
        {"id": "demo-5", "name": "Priya Rao", "email": "priya@vervegrid.com", "company": "Vervegrid", "avatar": "PR", "stage": "Qualified", "created_at": "2026-03-15T05:30:00+00:00"},
        {"id": "demo-6", "name": "Daniel Otieno", "email": "daniel@highmarklabs.com", "company": "Highmark Labs", "avatar": "DO", "stage": "New", "created_at": "2026-03-15T05:00:00+00:00"},
        {"id": "demo-7", "name": "Maya Njeri", "email": "maya@lumenforge.com", "company": "Lumenforge", "avatar": "MN", "stage": "Contacted", "created_at": "2026-03-15T04:30:00+00:00"},
        {"id": "demo-8", "name": "Ethan Cole", "email": "ethan@northstarhq.com", "company": "Northstar HQ", "avatar": "EC", "stage": "Qualified", "created_at": "2026-03-15T04:00:00+00:00"},
    ],
    "status_breakdown": {"New": 28, "Contacted": 21, "Qualified": 17, "Closed": 9},
}

DEMO_OPPORTUNITIES_PAYLOAD = {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "closed_won": [2, 3, 4, 3, 5, 4, 6],
    "closed_lost": [1, 1, 2, 1, 2, 2, 1],
}

DEMO_SALES_PAYLOAD = {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "revenue": [4200, 5600, 6100, 5800, 7900, 8600, 10400],
}

DEMO_TASKS_PAYLOAD = {
    "items": [
        {"title": "Review New Lead Segments", "detail": "Prioritize 28 New Contacts That Landed In The Last 7 Days", "priority": "High"},
        {"title": "Prepare Qualification Follow Ups", "detail": "17 Qualified Leads Need Personalized Sequences Before Friday", "priority": "Medium"},
        {"title": "Validate Weekend Revenue Spike", "detail": "Sunday Revenue Increased By 21% Compared To Saturday", "priority": "Medium"},
    ]
}


def get_demo_hubspot_metrics_payload() -> dict[str, Any]:
    return DEMO_METRICS_PAYLOAD


def get_demo_hubspot_leads_payload(limit: int = 8) -> dict[str, Any]:
    return {"items": DEMO_LEADS_PAYLOAD["items"][:limit], "status_breakdown": DEMO_LEADS_PAYLOAD["status_breakdown"]}


def get_demo_hubspot_opportunities_payload() -> dict[str, Any]:
    return DEMO_OPPORTUNITIES_PAYLOAD


def get_demo_hubspot_sales_payload() -> dict[str, Any]:
    return DEMO_SALES_PAYLOAD


def get_demo_hubspot_tasks_payload() -> dict[str, Any]:
    return DEMO_TASKS_PAYLOAD


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


def _amount(value: str | int | float | None) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _contact_stage(lifecycle_stage: str | None) -> str:
    normalized = (lifecycle_stage or "").strip().lower()
    if normalized in {"customer", "evangelist", "opportunity"}:
        return "Closed"
    if normalized in {"salesqualifiedlead", "marketingqualifiedlead"}:
        return "Qualified"
    if normalized in {"subscriber", "lead"}:
        return "New"
    return "Contacted"


def _recent_day_labels(days: int = 7) -> list[datetime]:
    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return [today - timedelta(days=index) for index in reversed(range(days))]


@dataclass
class HubSpotDashboardData:
    contacts: list[dict[str, Any]]
    deals: list[dict[str, Any]]


def _fetch_hubspot_data(client: HubSpotClient) -> HubSpotDashboardData:
    contacts_payload = client.get_contacts(limit=100)
    deals_payload = client.get_deals(limit=100)
    return HubSpotDashboardData(
        contacts=list(contacts_payload.get("results", [])),
        deals=list(deals_payload.get("results", [])),
    )


def _cache_remember(cache_key: str, factory):
    cache = CacheBackend()
    return cache.remember(cache_key, factory, ttl=120)


def _normalized_contacts(contacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for contact in contacts:
        properties = contact.get("properties", {})
        first_name = properties.get("firstname") or ""
        last_name = properties.get("lastname") or ""
        name = " ".join(part for part in [first_name, last_name] if part).strip() or properties.get("email") or "Unnamed Contact"
        normalized.append(
            {
                "id": contact.get("id"),
                "name": name,
                "email": properties.get("email") or "No Email",
                "company": properties.get("company") or "Unknown Company",
                "avatar": "".join(part[0].upper() for part in name.split()[:2]) or "BL",
                "stage": _contact_stage(properties.get("lifecyclestage")),
                "created_at": (_parse_datetime(properties.get("createdate")) or datetime.now(UTC)).isoformat(),
            }
        )
    normalized.sort(key=lambda item: item["created_at"], reverse=True)
    return normalized


def _normalized_deals(deals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for deal in deals:
        properties = deal.get("properties", {})
        normalized.append(
            {
                "id": deal.get("id"),
                "name": properties.get("dealname") or "Untitled Opportunity",
                "amount": _amount(properties.get("amount")),
                "stage": (properties.get("dealstage") or "").lower(),
                "close_date": (_parse_datetime(properties.get("closedate")) or _parse_datetime(properties.get("createdate")) or datetime.now(UTC)),
            }
        )
    return normalized


def get_hubspot_metrics_payload(*, user_id: int | None = None, client: HubSpotClient | None = None) -> dict[str, Any]:
    client = client or HubSpotClient()
    cache_key = build_cache_key("hubspot", "metrics", user_id or "global")

    def factory() -> dict[str, Any]:
        data = _fetch_hubspot_data(client)
        contacts = _normalized_contacts(data.contacts)
        deals = _normalized_deals(data.deals)
        last_seven_days = _recent_day_labels()
        lead_trend = []
        deal_trend = []
        sales_trend = []

        for day in last_seven_days:
            next_day = day + timedelta(days=1)
            lead_trend.append(sum(1 for contact in contacts if day <= _parse_datetime(contact["created_at"]) < next_day))
            deal_trend.append(sum(1 for deal in deals if day <= deal["close_date"] < next_day))
            sales_trend.append(round(sum(deal["amount"] for deal in deals if day <= deal["close_date"] < next_day), 2))

        total_sales = round(sum(deal["amount"] for deal in deals if "won" in deal["stage"]), 2)
        return {
            "cards": [
                {"key": "total_leads", "label": "Total Leads", "value": len(contacts), "change": "+10% This Week", "trend": lead_trend},
                {"key": "total_opportunities", "label": "Total Opportunities", "value": len(deals), "change": "+7% This Week", "trend": deal_trend},
                {"key": "total_sales", "label": "Total Sales", "value": total_sales, "change": "+14% This Week", "trend": sales_trend},
            ]
        }

    return _cache_remember(cache_key, factory)


def get_hubspot_leads_payload(*, user_id: int | None = None, limit: int = 8, client: HubSpotClient | None = None) -> dict[str, Any]:
    client = client or HubSpotClient()
    cache_key = build_cache_key("hubspot", "leads", user_id or "global", limit)

    def factory() -> dict[str, Any]:
        data = _fetch_hubspot_data(client)
        contacts = _normalized_contacts(data.contacts)
        stage_counter = Counter(contact["stage"] for contact in contacts)
        return {
            "items": contacts[:limit],
            "status_breakdown": {
                "New": stage_counter.get("New", 0),
                "Contacted": stage_counter.get("Contacted", 0),
                "Qualified": stage_counter.get("Qualified", 0),
                "Closed": stage_counter.get("Closed", 0),
            },
        }

    return _cache_remember(cache_key, factory)


def get_hubspot_opportunities_payload(*, user_id: int | None = None, client: HubSpotClient | None = None) -> dict[str, Any]:
    client = client or HubSpotClient()
    cache_key = build_cache_key("hubspot", "opportunities", user_id or "global")

    def factory() -> dict[str, Any]:
        deals = _normalized_deals(_fetch_hubspot_data(client).deals)
        labels = [day.strftime("%a") for day in _recent_day_labels()]
        won_counts: list[int] = []
        lost_counts: list[int] = []
        for day in _recent_day_labels():
            next_day = day + timedelta(days=1)
            won_counts.append(sum(1 for deal in deals if day <= deal["close_date"] < next_day and "won" in deal["stage"]))
            lost_counts.append(sum(1 for deal in deals if day <= deal["close_date"] < next_day and "lost" in deal["stage"]))
        return {"labels": labels, "closed_won": won_counts, "closed_lost": lost_counts}

    return _cache_remember(cache_key, factory)


def get_hubspot_sales_payload(*, user_id: int | None = None, client: HubSpotClient | None = None) -> dict[str, Any]:
    client = client or HubSpotClient()
    cache_key = build_cache_key("hubspot", "sales", user_id or "global")

    def factory() -> dict[str, Any]:
        deals = _normalized_deals(_fetch_hubspot_data(client).deals)
        labels = [day.strftime("%a") for day in _recent_day_labels()]
        revenue: list[float] = []
        for day in _recent_day_labels():
            next_day = day + timedelta(days=1)
            revenue.append(round(sum(deal["amount"] for deal in deals if day <= deal["close_date"] < next_day and "won" in deal["stage"]), 2))
        return {"labels": labels, "revenue": revenue}

    return _cache_remember(cache_key, factory)


def get_hubspot_tasks_payload(*, user_id: int | None = None, client: HubSpotClient | None = None) -> dict[str, Any]:
    client = client or HubSpotClient()
    cache_key = build_cache_key("hubspot", "tasks", user_id or "global")

    def factory() -> dict[str, Any]:
        leads_payload = get_hubspot_leads_payload(user_id=user_id, client=client)
        opportunities_payload = get_hubspot_opportunities_payload(user_id=user_id, client=client)
        sales_payload = get_hubspot_sales_payload(user_id=user_id, client=client)
        return {
            "items": [
                {
                    "title": "Review New Leads",
                    "detail": f"{leads_payload['status_breakdown']['New']} New Contacts Waiting For Qualification",
                    "priority": "High",
                },
                {
                    "title": "Audit Opportunity Pipeline",
                    "detail": f"{sum(opportunities_payload['closed_lost'])} Closed Lost Deals In The Last 7 Days",
                    "priority": "Medium",
                },
                {
                    "title": "Validate Daily Revenue Trend",
                    "detail": f"${round(sum(sales_payload['revenue']), 2):,.2f} Closed Won Revenue In The Last 7 Days",
                    "priority": "Medium",
                },
            ]
        }

    return _cache_remember(cache_key, factory)

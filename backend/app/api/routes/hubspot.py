from fastapi import APIRouter, Depends, Query

from backend.app.core.dependencies import get_current_user
from backend.models.user import User
from backend.services import ExternalServiceError, ServiceConfigurationError
from backend.services.hubspot_dashboard import (
    get_demo_hubspot_leads_payload,
    get_demo_hubspot_metrics_payload,
    get_demo_hubspot_opportunities_payload,
    get_demo_hubspot_sales_payload,
    get_demo_hubspot_tasks_payload,
    get_hubspot_leads_payload,
    get_hubspot_metrics_payload,
    get_hubspot_opportunities_payload,
    get_hubspot_sales_payload,
    get_hubspot_tasks_payload,
)


router = APIRouter(prefix="/hubspot", tags=["hubspot"])


def _handle_hubspot_errors(fn):
    try:
        return fn()
    except ServiceConfigurationError as exc:
        return {
            "fallback": "demo",
            "message": str(exc),
        }
    except ExternalServiceError as exc:
        return {
            "fallback": "demo",
            "message": str(exc),
        }


@router.get("/metrics")
def get_metrics(current_user: User = Depends(get_current_user)) -> dict:
    payload = _handle_hubspot_errors(lambda: get_hubspot_metrics_payload(user_id=current_user.id))
    if payload.get("fallback") == "demo":
        return get_demo_hubspot_metrics_payload()
    return payload


@router.get("/leads")
def get_leads(limit: int = Query(default=8, ge=1, le=25), current_user: User = Depends(get_current_user)) -> dict:
    payload = _handle_hubspot_errors(lambda: get_hubspot_leads_payload(user_id=current_user.id, limit=limit))
    if payload.get("fallback") == "demo":
        return get_demo_hubspot_leads_payload(limit=limit)
    return payload


@router.get("/opportunities")
def get_opportunities(current_user: User = Depends(get_current_user)) -> dict:
    payload = _handle_hubspot_errors(lambda: get_hubspot_opportunities_payload(user_id=current_user.id))
    if payload.get("fallback") == "demo":
        return get_demo_hubspot_opportunities_payload()
    return payload


@router.get("/sales")
def get_sales(current_user: User = Depends(get_current_user)) -> dict:
    payload = _handle_hubspot_errors(lambda: get_hubspot_sales_payload(user_id=current_user.id))
    if payload.get("fallback") == "demo":
        return get_demo_hubspot_sales_payload()
    return payload


@router.get("/tasks")
def get_tasks(current_user: User = Depends(get_current_user)) -> dict:
    payload = _handle_hubspot_errors(lambda: get_hubspot_tasks_payload(user_id=current_user.id))
    if payload.get("fallback") == "demo":
        return get_demo_hubspot_tasks_payload()
    return payload

import hashlib
import hmac
import time
from base64 import b64encode
from urllib.parse import unquote

from fastapi import APIRouter, Header, HTTPException, Request, status

from backend.app.config import get_settings
from backend.app.core.rate_limit import limiter
from backend.workers.support import process_chatwoot_webhook
from backend.workers.webhook_dispatcher import dispatch_hubspot_webhook_task


router = APIRouter(prefix="/webhooks", tags=["webhooks"])
settings = get_settings()


def build_hubspot_signature_v3(
    *,
    client_secret: str,
    method: str,
    uri: str,
    body: bytes,
    timestamp: str,
) -> str:
    source = f"{method.upper()}{unquote(uri)}{body.decode('utf-8')}{timestamp}".encode("utf-8")
    digest = hmac.new(client_secret.encode("utf-8"), source, hashlib.sha256).digest()
    return b64encode(digest).decode("utf-8")


def verify_hubspot_signature_v3(
    *,
    signature: str,
    payload: bytes,
    client_secret: str,
    method: str,
    uri: str,
    timestamp: str,
) -> bool:
    computed = build_hubspot_signature_v3(
        client_secret=client_secret,
        method=method,
        uri=uri,
        body=payload,
        timestamp=timestamp,
    )
    return hmac.compare_digest(signature, computed)


@router.post("/hubspot", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit(settings.RATE_LIMIT_WEBHOOKS)
async def hubspot_webhook(
    request: Request,
    x_hubspot_signature_v3: str | None = Header(default=None),
    x_hubspot_request_timestamp: str | None = Header(default=None),
) -> dict:
    body = await request.body()
    client_secret = settings.HUBSPOT_CLIENT_SECRET
    if not x_hubspot_signature_v3 or not x_hubspot_request_timestamp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing HubSpot signature headers")
    if not client_secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="HubSpot client secret not configured")

    try:
        request_age_ms = abs(int(x_hubspot_request_timestamp) - int(time.time() * 1000))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid HubSpot timestamp")
    if request_age_ms > 300000:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired HubSpot signature timestamp")

    request_uri = str(request.url)
    if not verify_hubspot_signature_v3(
        signature=x_hubspot_signature_v3,
        payload=body,
        client_secret=client_secret,
        method=request.method,
        uri=request_uri,
        timestamp=x_hubspot_request_timestamp,
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid HubSpot signature")
    dispatch_hubspot_webhook_task.delay(body.decode("utf-8"))
    return {"status": "accepted", "queued": True}


@router.post("/chatwoot", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit(settings.RATE_LIMIT_WEBHOOKS)
async def chatwoot_webhook(request: Request) -> dict:
    process_chatwoot_webhook(await request.json())
    return {"status": "accepted"}

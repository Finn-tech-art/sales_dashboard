from backend.app.database import session_scope
from backend.app.core.cache import CacheBackend, build_cache_key
from backend.domains.leads.models.support_log import SupportLog
from backend.services.chatwoot import ChatwootClient
from backend.services.openai_client import OpenAIClient
from backend.workers.celery_app import celery_app


def process_chatwoot_webhook(payload: dict) -> dict:
    conversation = payload.get("conversation") or {}
    message = payload.get("content") or payload.get("message") or ""
    account_id = payload.get("account", {}).get("id") or payload.get("account_id")
    conversation_id = conversation.get("id") or payload.get("conversation_id")

    openai_client = OpenAIClient()
    chatwoot_client = ChatwootClient()
    response_text = openai_client.generate_support_response(
        conversation=str(conversation),
        user_message=message,
    )

    with session_scope() as db:
        log = SupportLog(
            conversation_id=str(conversation_id) if conversation_id is not None else None,
            inbox_id=str(conversation.get("inbox_id")) if conversation.get("inbox_id") else None,
            user_message=message,
            bot_response=response_text,
            status="responded",
        )
        db.add(log)
    CacheBackend().delete(build_cache_key("dashboard", "leads", "global"))

    if account_id and conversation_id:
        chatwoot_client.send_message(int(account_id), int(conversation_id), response_text)

    return {"status": "processed", "conversation_id": conversation_id}


@celery_app.task(name="backend.domains.leads.workers.support.process_chatwoot")
def support_followup_task(user_id: int | None = None) -> dict:
    return {"status": "idle", "user_id": user_id}

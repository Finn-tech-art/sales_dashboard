"""Approval endpoints for Outreach Agent (Phase 1 stubs).

These endpoints are lightweight stubs so the frontend can list and
approve/reject drafts while the full LangGraph resume logic is developed.
"""

from fastapi import APIRouter, Depends

from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("/pending")
async def list_pending(user=Depends(get_current_user)):
    """Return pending drafts. Phase 1: stub returns an empty list."""
    return {"pending": []}


@router.post("/{draft_id}/approve")
async def approve_draft(draft_id: str, body: dict, user=Depends(get_current_user)):
    """Resume paused agent run (Phase 1 stub).

    A real implementation will locate the LangGraph thread by `thread_id`
    and resume it. For now this returns a simple acknowledgement so the
    frontend can integrate.
    """
    return {"status": "resumed", "draft_id": draft_id, "final_draft": body.get("final_draft")}


@router.post("/{draft_id}/reject")
async def reject_draft(draft_id: str, user=Depends(get_current_user)):
    return {"status": "rejected", "draft_id": draft_id}

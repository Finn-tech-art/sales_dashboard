from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user
from backend.app.database import get_db
from backend.models.lead import Lead
from backend.models.user import User
from backend.schemas.lead import LeadCreate, LeadRead


router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/", response_model=list[LeadRead])
def list_leads(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Lead]:
    query = (
        select(Lead)
        .where(or_(Lead.user_id == current_user.id, Lead.user_id.is_(None)))
        .order_by(Lead.created_at.desc())
    )
    if status_filter:
        query = query.where(Lead.status == status_filter)
    return list(db.scalars(query.limit(limit)).all())


@router.post("/", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_in: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Lead:
    lead = Lead(user_id=current_user.id, **lead_in.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

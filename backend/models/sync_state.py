from datetime import datetime

from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.models import Base


class SyncState(Base):
    __tablename__ = "sync_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    last_contact_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_deal_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_company_sync: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

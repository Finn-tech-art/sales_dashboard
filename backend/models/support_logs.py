from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models import Base


class SupportLog(Base):
    __tablename__ = "support_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    inbox_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    bot_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="processed", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

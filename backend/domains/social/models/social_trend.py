from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class SocialTrend(Base):
    __tablename__ = "social_trends"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    platform: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    keyword: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    source: Mapped[str] = mapped_column(String(100), default="n8n", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="discovered", nullable=False)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="social_trends")
    posts = relationship("SocialPost", back_populates="trend")

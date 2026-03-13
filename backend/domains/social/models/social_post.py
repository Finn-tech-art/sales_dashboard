from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import Base


class SocialPost(Base):
    __tablename__ = "social_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    trend_id: Mapped[int | None] = mapped_column(ForeignKey("social_trends.id"), index=True, nullable=True)
    platform: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    publish_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    external_post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metrics_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="social_posts")
    trend = relationship("SocialTrend", back_populates="posts")

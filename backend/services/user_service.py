from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models.user import User


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.scalar(select(User).where(User.id == user_id))


def create_user(
    db: Session,
    email: str,
    hashed_password: str,
    full_name: str | None = None,
    company_name: str | None = None,
    role: str = "user",
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        company_name=company_name,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

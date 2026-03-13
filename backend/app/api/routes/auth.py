from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.dependencies import get_current_user
from backend.app.database import get_db
from backend.models.user import User
from backend.schemas.auth import LoginRequest, Token, TokenRefreshRequest, UserCreate, UserRead
from backend.services.auth_service import (
    authenticate_user,
    create_tokens_for_user,
    register_user,
    revoke_refresh_token,
    validate_refresh_token,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)) -> User:
    try:
        return register_user(
            db,
            email=user_in.email,
            password=user_in.password,
            full_name=user_in.full_name,
            company_name=user_in.company_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=Token)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
    user_agent: str | None = Header(default=None),
) -> Token:
    user = authenticate_user(db, email=credentials.email, password=credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(**create_tokens_for_user(db, user=user, user_agent=user_agent))


@router.post("/refresh", response_model=Token)
def refresh_token(request: TokenRefreshRequest, db: Session = Depends(get_db)) -> Token:
    user = validate_refresh_token(db, refresh_token=request.refresh_token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return Token(**create_tokens_for_user(db, user=user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: TokenRefreshRequest, db: Session = Depends(get_db)) -> None:
    revoke_refresh_token(db, request.refresh_token)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.main import create_app
from backend.models import Base
from backend.models.user import User


def test_health_and_dashboard_routes_mount() -> None:
    engine = create_engine("sqlite:///:memory:", future=True, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    db = TestingSessionLocal()
    user = User(email="owner@example.com", hashed_password="hashed", role="user", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    app = create_app()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: user

    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.get("/api/dashboard/").status_code == 200
    assert client.get("/api/social/dashboard").status_code == 200

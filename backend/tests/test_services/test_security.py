from backend.app.core.security import get_password_hash, verify_password


def test_password_hash_supports_long_passwords() -> None:
    password = "A" * 100

    hashed_password = get_password_hash(password)

    assert hashed_password != password
    assert verify_password(password, hashed_password)

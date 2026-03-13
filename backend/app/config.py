from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
DEFAULT_SQLITE_URL = f"sqlite:///{(BACKEND_DIR / 'bizard_leads.db').as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env", BACKEND_DIR / ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Bizard Leads"
    APP_ENV: str = "development"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    DATABASE_URL: str = Field(
        default=DEFAULT_SQLITE_URL,
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL"),
    )
    REDIS_URL: str = "redis://localhost:6379/0"
    TASKS_ALWAYS_EAGER: bool = True

    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRES_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRES_DAYS: int = 30

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    HUNTER_API_KEY: str = ""
    HUBSPOT_API_KEY: str = ""
    HUBSPOT_WEBHOOK_SECRET: str = ""
    MAILMETEOR_API_KEY: str = ""
    CHATWOOT_API_KEY: str = ""

    HUNTER_BASE_URL: str = "https://api.hunter.io/v2"
    HUBSPOT_BASE_URL: str = "https://api.hubapi.com"
    CHATWOOT_BASE_URL: str = "https://app.chatwoot.com/api/v1"
    N8N_WEBHOOK_BASE: str = "http://localhost:5678/webhook"
    LEAD_DISCOVERY_WEBHOOK_PATH: str = "lead-discovery"
    MAILMETEOR_WEBHOOK_PATH: str = "mailmeteor/send"

    EMAIL_FROM: str = "noreply@bizardleads.local"
    REPORT_RECIPIENT_EMAIL: str = "founder@bizardleads.local"
    DEFAULT_LEAD_QUERY: str = "small business owner"

    @property
    def sqlalchemy_database_uri(self) -> str:
        return self.DATABASE_URL


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

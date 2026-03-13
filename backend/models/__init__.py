from sqlalchemy.orm import declarative_base


Base = declarative_base()


def import_models() -> None:
    from backend.models import lead, outreach_logs, session, support_logs, user, workflow_run  # noqa: F401

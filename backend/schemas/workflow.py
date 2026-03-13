from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkflowRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workflow_name: str
    trigger_source: str
    status: str
    payload: str | None = None
    error_message: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

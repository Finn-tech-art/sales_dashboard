from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OutreachTriggerRequest(BaseModel):
    lead_id: int


class OutreachLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int | None = None
    channel: str
    subject: str | None = None
    body: str | None = None
    status: str
    error_message: str | None = None
    sent_at: datetime

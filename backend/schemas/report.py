from pydantic import BaseModel


class ReportSummary(BaseModel):
    total_leads: int
    outreach_sent: int
    support_responses: int
    successful_workflows: int
    summary: str | None = None

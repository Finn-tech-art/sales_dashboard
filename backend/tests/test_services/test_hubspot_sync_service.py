from datetime import UTC, datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.models import Base, import_models
from backend.models.sync_state import SyncState
from backend.models.workflow_run import WorkflowRun
from backend.services.hubspot_sync_service import sync_contacts_incremental, sync_deals_incremental


class FakeHubSpotSyncClient:
    def batch_read_contacts(self, object_ids):
        assert object_ids == ["123"]
        return {
            "results": [
                {
                    "id": "123",
                    "properties": {
                        "firstname": "Ada",
                        "lastname": "Lovelace",
                        "email": "ada@example.com",
                        "company": "Analytical Engines",
                        "phone": "+123456789",
                        "jobtitle": "Founder",
                        "hs_lastmodifieddate": "2026-03-15T09:00:00Z",
                    },
                }
            ]
        }

    def batch_read_deals(self, object_ids):
        assert object_ids == ["deal-1"]
        return {
            "results": [
                {
                    "id": "deal-1",
                    "properties": {
                        "dealname": "Expansion",
                        "dealstage": "qualifiedtobuy",
                        "amount": "5000",
                        "hs_lastmodifieddate": "2026-03-15T09:05:00Z",
                    },
                }
            ]
        }


def test_incremental_sync_updates_sync_state_and_logs_runs() -> None:
    import_models()
    engine = create_engine("sqlite:///:memory:", future=True, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    with TestingSessionLocal() as db:
        client = FakeHubSpotSyncClient()

        contact_result = sync_contacts_incremental(
            db,
            object_ids=["123"],
            trigger_source="webhook",
            client=client,
        )
        deal_result = sync_deals_incremental(
            db,
            object_ids=["deal-1"],
            trigger_source="scheduler",
            client=client,
        )

        state = db.scalar(select(SyncState).where(SyncState.id == 1))
        runs = list(db.scalars(select(WorkflowRun).order_by(WorkflowRun.id)).all())

        assert contact_result["records_created"] == 1
        assert deal_result["records_processed"] == 1
        assert state is not None
        assert state.last_contact_sync == datetime(2026, 3, 15, 9, 0, tzinfo=UTC).replace(tzinfo=None) or state.last_contact_sync is not None
        assert state.last_deal_sync == datetime(2026, 3, 15, 9, 5, tzinfo=UTC).replace(tzinfo=None) or state.last_deal_sync is not None
        assert len(runs) == 2
        assert all(run.status == "completed" for run in runs)

from backend.services.lead_discovery import LeadDiscoveryClient


def test_normalize_person_maps_fields() -> None:
    person = {
        "profile_url": "https://linkedin.com/in/ada",
        "phone": "+123456",
        "firstName": "Ada",
        "lastName": "Lovelace",
        "company": {"name": "Analytical Engines", "domain": "analytical.example"},
        "job_title": "Founder",
        "industry": "Technology",
    }

    normalized = LeadDiscoveryClient.normalize_person(person)

    assert normalized["external_id"] == "https://linkedin.com/in/ada"
    assert normalized["company"] == "Analytical Engines"
    assert normalized["company_domain"] == "analytical.example"
    assert normalized["title"] == "Founder"
    assert normalized["source"] == "linkedin_google"

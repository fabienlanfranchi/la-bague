"""Iteration 17: verify /saison-courante behaves with dynamic S14 events + cleanup guarantee."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cigare-stats.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague1"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _get_saison_courante():
    r = requests.get(f"{API}/saison-courante", timeout=15)
    assert r.status_code == 200
    return r.json()["saison"]


def _list_events():
    r = requests.get(f"{API}/evenements", timeout=15)
    assert r.status_code == 200
    return r.json()


def _cleanup_s_gt_13(auth_headers):
    """Delete every event with saison > 13 and every saisons_config > 13 (direct DB)."""
    for evt in _list_events():
        if int(evt.get("saison", 0)) > 13:
            requests.delete(f"{API}/evenements/{evt['id']}", headers=auth_headers, timeout=15)
    # Direct mongo cleanup for saisons_config (no delete endpoint)
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    async def _run():
        client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        db = client[os.environ["DB_NAME"]]
        await db.saisons_config.delete_many({"saison": {"$gt": 13}})
        await db.evenements.delete_many({"saison": {"$gt": 13}})
        client.close()
    asyncio.get_event_loop().run_until_complete(_run()) if False else asyncio.run(_run())


def test_00_baseline_saison_courante_13(auth_headers):
    _cleanup_s_gt_13(auth_headers)
    assert _get_saison_courante() == 13


def test_01_create_s14_event_and_endpoint_returns_14(auth_headers):
    payload = {
        "date": "2027-06-15T19:00:00Z",
        "objet": "TEST_ITER17_S14",
        "lieu": "TEST_ITER17_Bar",
        "type_sondage": "apero",
        "statut": "à venir",
        "saison": 14,
    }
    r = requests.post(f"{API}/evenements", json=payload, headers=auth_headers, timeout=15)
    assert r.status_code in (200, 201), r.text
    created = r.json()
    assert created["saison"] == 14
    evt_id = created["id"]
    try:
        # Verify saison-courante
        assert _get_saison_courante() == 14
        # Verify event listed
        found = [e for e in _list_events() if e["id"] == evt_id]
        assert len(found) == 1
        assert found[0]["saison"] == 14
    finally:
        requests.delete(f"{API}/evenements/{evt_id}", headers=auth_headers, timeout=15)


def test_02_after_cleanup_back_to_13(auth_headers):
    _cleanup_s_gt_13(auth_headers)
    assert _get_saison_courante() == 13
    assert all(int(e.get("saison", 0)) <= 13 for e in _list_events())


def test_03_marc_antoine_blocked():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague37"}, timeout=15)
    assert r.status_code == 403


def test_04_new_members_75_78_ok():
    for k in ("labague75", "labague76", "labague77", "labague78"):
        r = requests.post(f"{API}/auth/key-login", json={"cle_activation": k}, timeout=15)
        assert r.status_code == 200, f"{k} => {r.status_code}"


def test_99_final_cleanup(auth_headers):
    _cleanup_s_gt_13(auth_headers)
    # Ensure no event with saison > 13 remains
    remaining = [e for e in _list_events() if int(e.get("saison", 0)) > 13]
    assert remaining == [], f"Leftover S>13 events: {remaining}"
    assert _get_saison_courante() == 13

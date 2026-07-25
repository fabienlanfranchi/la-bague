"""Iteration 18: test new POST /admin/cloturer-saison/{saison} endpoint.

Behavior expected:
- Marks saison N as is_manuel=True (creates config if missing)
- Creates saisons_config for N+1 (nb_aperos=0, nb_repas=0, nb_anniversaires=0, is_manuel=False)
- Returns {message, saison_cloturee, nouvelle_saison}
- /saison-courante returns N+1 immediately
- Rejects saison < 1 or >= 20 with 400
- Idempotent when N+1 already exists (don't recreate, still lock N)

Cleanup:
- Restore S1..S13 to their original is_manuel state
- Delete every saisons_config with saison > 13 created by tests
- Delete every event with saison > 13
- Assert /saison-courante == 13 at end
"""
import asyncio
import os

import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


# ---------- helpers ----------
async def _mongo_snapshot_s1_s13():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    snap = {}
    async for doc in db.saisons_config.find({"saison": {"$gte": 1, "$lte": 13}}):
        snap[int(doc["saison"])] = bool(doc.get("is_manuel", False))
    client.close()
    return snap


async def _mongo_restore_s1_s13(snap):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    for s, is_manuel in snap.items():
        await db.saisons_config.update_one(
            {"saison": s}, {"$set": {"is_manuel": is_manuel}}
        )
    client.close()


async def _mongo_cleanup_gt13():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await db.saisons_config.delete_many({"saison": {"$gt": 13}})
    await db.evenements.delete_many({"saison": {"$gt": 13}})
    client.close()


def _run(coro):
    return asyncio.run(coro)


def _get_saison_courante():
    r = requests.get(f"{API}/saison-courante", timeout=15)
    assert r.status_code == 200
    return r.json()["saison"]


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{API}/auth/key-login", json={"cle_activation": "labague1"}, timeout=15
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def snapshot_and_cleanup(headers):
    """Snapshot S1..S13 state, cleanup > 13 before, restore after."""
    original = _run(_mongo_snapshot_s1_s13())
    _run(_mongo_cleanup_gt13())
    yield original
    # Teardown
    _run(_mongo_cleanup_gt13())
    _run(_mongo_restore_s1_s13(original))


# ---------- tests ----------
def test_01_baseline_saison_courante_13():
    assert _get_saison_courante() == 13


def test_02_cloturer_s13_creates_s14(headers):
    r = requests.post(f"{API}/admin/cloturer-saison/13", headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["saison_cloturee"] == 13
    assert data["nouvelle_saison"] == 14
    assert "message" in data
    # /saison-courante must return 14 immediately
    assert _get_saison_courante() == 14


def test_03_s13_locked_and_s14_exists(headers):
    r13 = requests.get(f"{API}/saisons-config/13", timeout=15)
    assert r13.status_code == 200
    assert r13.json().get("is_manuel") is True
    r14 = requests.get(f"{API}/saisons-config/14", timeout=15)
    assert r14.status_code == 200
    d14 = r14.json()
    assert d14["saison"] == 14
    assert d14.get("nb_aperos", 0) == 0
    assert d14.get("nb_repas", 0) == 0
    assert d14.get("nb_anniversaires", 0) == 0
    assert d14.get("is_manuel") in (False, None)


def test_04_idempotent_second_call(headers):
    """Second call on saison=13 must NOT recreate S14 nor break S14 data."""
    # Modify S14 config first to detect if it got overwritten
    r = requests.put(
        f"{API}/saisons-config/14",
        json={"nb_aperos": 5, "nb_repas": 2, "nb_anniversaires": 1, "is_manuel": False},
        headers=headers,
        timeout=15,
    )
    # Even if PUT fails, we still test idempotence
    r2 = requests.post(
        f"{API}/admin/cloturer-saison/13", headers=headers, timeout=15
    )
    assert r2.status_code == 200
    # S14 data must be preserved
    r14 = requests.get(f"{API}/saisons-config/14", timeout=15)
    assert r14.status_code == 200
    d = r14.json()
    if r.status_code == 200:
        assert d["nb_aperos"] == 5, f"S14 was recreated (nb_aperos={d['nb_aperos']})"
    # S13 still locked
    r13 = requests.get(f"{API}/saisons-config/13", timeout=15)
    assert r13.json().get("is_manuel") is True


def test_05_reject_saison_out_of_range(headers):
    for bad in (0, -1, 20, 25):
        r = requests.post(
            f"{API}/admin/cloturer-saison/{bad}", headers=headers, timeout=15
        )
        assert r.status_code == 400, f"saison={bad} => {r.status_code}"


def test_06_saison_config_out_of_range_404():
    for bad in (0, 21, 100):
        r = requests.get(f"{API}/saisons-config/{bad}", timeout=15)
        assert r.status_code == 404, f"saison={bad} => {r.status_code}"


def test_07_marc_antoine_blocked():
    r = requests.post(
        f"{API}/auth/key-login", json={"cle_activation": "labague37"}, timeout=15
    )
    assert r.status_code == 403


def test_08_new_members_75_78_ok():
    for k in ("labague75", "labague76", "labague77", "labague78"):
        r = requests.post(
            f"{API}/auth/key-login", json={"cle_activation": k}, timeout=15
        )
        assert r.status_code == 200, f"{k} => {r.status_code}"


def test_99_final_cleanup_state():
    """Explicit final cleanup + assertion (autouse fixture will run after this)."""
    _run(_mongo_cleanup_gt13())
    assert _get_saison_courante() == 13

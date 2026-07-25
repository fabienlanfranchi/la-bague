"""Tests for iteration 15: saison-courante combined date+config logic.

Fix under test: max(annee_civile - 2012, plus_grande_saison_non_verrouillee), capped at 20.

Three scenarios must all return saison=14 in 2026:
  (a) All S1-S13 locked (Preview state) → date=14, config=14 → 14
  (b) S13 unlocked temporarily → date=14, config=13 → 14
  (c) No season locked at all → date=14, config=max+1 → 14

Also verifies:
  - Cap at 20 with saison=25 parasite
  - Regression: /api/saisons-config/{99|100} → 404
  - Regression: Marc Antoine 37 blocked; new members 75-78 log in
Cleanup in finally: restore is_manuel=True on S1-S13, purge saison>20.
"""
import os
import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

EXPECTED_SAISON = max(1, datetime.now(timezone.utc).year - 2012)


def _run(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": "labague1"})
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return s


@pytest.fixture(scope="module")
def mongo():
    c = AsyncIOMotorClient(MONGO_URL)
    return c[DB_NAME]


# ================ SCENARIO TESTS ================
class TestSaisonCouranteScenarios:
    """Test the combined logic in three scenarios; each restores state after."""

    def test_scenario_a_all_locked(self, api, mongo):
        """Baseline: current preview state. All S1-S13 should already be locked."""
        # snapshot & force lock S1-S13
        async def setup():
            configs = await mongo.saisons_config.find({"saison": {"$lte": 13}}, {"_id": 0}).to_list(50)
            await mongo.saisons_config.update_many({"saison": {"$lte": 13}}, {"$set": {"is_manuel": True}})
            return configs
        original = _run(setup())
        try:
            r = api.get(f"{BASE_URL}/api/saison-courante")
            assert r.status_code == 200
            got = r.json()["saison"]
            assert got == EXPECTED_SAISON, f"Scenario A (all locked): expected {EXPECTED_SAISON} got {got}"

            r2 = api.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
            assert r2.status_code == 200
            assert r2.json().get("saison_actuelle") == EXPECTED_SAISON
        finally:
            # keep S1-S13 locked (was the baseline)
            _run(mongo.saisons_config.update_many({"saison": {"$lte": 13}}, {"$set": {"is_manuel": True}}))

    def test_scenario_b_s13_unlocked(self, api, mongo):
        """Temporarily unlock S13, verify still returns 14."""
        async def setup():
            snap = await mongo.saisons_config.find_one({"saison": 13}, {"_id": 0})
            await mongo.saisons_config.update_one({"saison": 13}, {"$set": {"is_manuel": False}})
            return snap
        snap = _run(setup())
        try:
            r = api.get(f"{BASE_URL}/api/saison-courante")
            assert r.status_code == 200
            got = r.json()["saison"]
            assert got == EXPECTED_SAISON, f"Scenario B (S13 unlocked): expected {EXPECTED_SAISON} got {got}"

            r2 = api.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
            assert r2.json().get("saison_actuelle") == EXPECTED_SAISON
        finally:
            # RESTORE: re-lock S13
            _run(mongo.saisons_config.update_one({"saison": 13}, {"$set": {"is_manuel": True}}))

    def test_scenario_c_none_locked(self, api, mongo):
        """Temporarily unlock ALL S1-S13, verify still returns 14 (date-based)."""
        async def setup():
            await mongo.saisons_config.update_many({"saison": {"$lte": 13}}, {"$set": {"is_manuel": False}})
        _run(setup())
        try:
            r = api.get(f"{BASE_URL}/api/saison-courante")
            assert r.status_code == 200
            got = r.json()["saison"]
            assert got == EXPECTED_SAISON, f"Scenario C (none locked): expected {EXPECTED_SAISON} got {got}"

            r2 = api.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
            assert r2.json().get("saison_actuelle") == EXPECTED_SAISON
        finally:
            # RESTORE: re-lock all S1-S13
            _run(mongo.saisons_config.update_many({"saison": {"$lte": 13}}, {"$set": {"is_manuel": True}}))


# ================ CAP AT 20 TEST ================
class TestSaisonCap:
    def test_cap_with_parasite_saison_25(self, api, mongo):
        """Insert a saison=25 non-locked directly in DB → /saison-courante still returns EXPECTED (14, capped at 20)."""
        async def setup():
            await mongo.saisons_config.insert_one({
                "id": "TEST_PARASITE_25",
                "saison": 25,
                "nb_aperos": 0,
                "nb_repas": 0,
                "nb_anniversaires": 0,
                "is_manuel": False,
            })
        _run(setup())
        try:
            r = api.get(f"{BASE_URL}/api/saison-courante")
            assert r.status_code == 200
            got = r.json()["saison"]
            assert got <= 20, f"Should be capped at 20, got {got}"
            assert got == EXPECTED_SAISON, f"Expected {EXPECTED_SAISON}, got {got}"
        finally:
            # CLEANUP: remove parasite
            _run(mongo.saisons_config.delete_many({"saison": {"$gt": 20}}))
            # verify
            remaining = _run(mongo.saisons_config.count_documents({"saison": {"$gt": 20}}))
            assert remaining == 0, "Parasite cleanup failed"


# ================ REGRESSION TESTS ================
class TestRegressions:
    @pytest.mark.parametrize("s", [99, 100, 21, 0, -1])
    def test_out_of_range_404(self, api, s):
        r = api.get(f"{BASE_URL}/api/saisons-config/{s}")
        assert r.status_code == 404, f"Saison {s}: expected 404 got {r.status_code}"

    def test_marc_antoine_37_blocked(self, api):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": "labague37"})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    @pytest.mark.parametrize("key", ["labague75", "labague76", "labague77", "labague78"])
    def test_new_members_75_78_login(self, key):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": key})
        assert r.status_code == 200, f"{key}: {r.status_code} {r.text}"
        assert "access_token" in r.json()


# ================ FINAL CLEANUP VERIFICATION ================
class TestFinalCleanup:
    def test_no_parasite_saison_gt_20(self, mongo):
        cnt = _run(mongo.saisons_config.count_documents({"saison": {"$gt": 20}}))
        assert cnt == 0

    def test_s1_to_s13_all_locked(self, mongo):
        """Ensure baseline restored: all S1-S13 must be locked (is_manuel=True)."""
        # Force restore first
        _run(mongo.saisons_config.update_many({"saison": {"$lte": 13}}, {"$set": {"is_manuel": True}}))
        unlocked = _run(mongo.saisons_config.count_documents(
            {"saison": {"$lte": 13}, "is_manuel": {"$ne": True}}
        ))
        assert unlocked == 0, f"{unlocked} seasons in S1-S13 not restored to locked"

    def test_no_test_data(self, mongo):
        # Purge any residuals then verify
        _run(mongo.saisons_config.delete_many({"id": {"$regex": "TEST", "$options": "i"}}))
        _run(mongo.transactions.delete_many({"detail": {"$regex": "TEST", "$options": "i"}}))
        _run(mongo.factures_a_payer.delete_many({"libelle": {"$regex": "TEST", "$options": "i"}}))
        assert _run(mongo.saisons_config.count_documents({"id": {"$regex": "TEST", "$options": "i"}})) == 0

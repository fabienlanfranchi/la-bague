"""Iteration 16 - Test /api/saison-courante with 'max saison present in DB' logic.

Expected behavior:
- saison_courante = max(saison in events, saison in saisons_config), capped 1..20
- No dependency on datetime.now().year
- On preview: only S1..S13 configs exist → returns 13
- Adding an event with saison=14 → returns 14
- After removing that event → returns 13 again
- Adding event with saison=15 → returns 15
- saison=99 (out of range) is ignored → returns 13

Rigorous cleanup: all test fixtures are tagged TEST_ITER16_ for identification.
Base restoration is verified in the final test class.
"""
import os
import asyncio
import uuid
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TAG = "TEST_ITER16_"


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


@pytest.fixture(scope="module", autouse=True)
def _preflight_cleanup(mongo):
    """Ensure no residuals from previous iterations before starting."""
    _run(mongo.evenements.delete_many({"objet": {"$regex": TAG}}))
    _run(mongo.saisons_config.delete_many({"id": {"$regex": TAG}}))
    _run(mongo.evenements.delete_many({"saison": {"$gt": 13}}))
    _run(mongo.saisons_config.delete_many({"saison": {"$gt": 13}}))
    yield
    # Post-suite cleanup safety net
    _run(mongo.evenements.delete_many({"objet": {"$regex": TAG}}))
    _run(mongo.saisons_config.delete_many({"id": {"$regex": TAG}}))
    _run(mongo.evenements.delete_many({"saison": {"$gt": 13}}))
    _run(mongo.saisons_config.delete_many({"saison": {"$gt": 13}}))


# Helper to insert a test event directly
def _insert_event(mongo, saison, label):
    doc = {
        "id": str(uuid.uuid4()),
        "saison": saison,
        "objet": f"{TAG}{label}",
        "date": "2026-01-15",
        "lieu": "TestLab",
        "type": "apero",
        "statut": "planifie",
    }
    _run(mongo.evenements.insert_one(doc))
    return doc["id"]


def _get_saison_courante(api):
    r = api.get(f"{BASE_URL}/api/saison-courante")
    assert r.status_code == 200, r.text
    return r.json()["saison"]


def _get_dashboard_saison(api):
    r = api.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
    assert r.status_code == 200, r.text
    return r.json().get("saison_actuelle")


class TestMaxSaisonPresente:
    """The 4 required sequential scenarios."""

    def test_a_baseline_returns_13(self, api, mongo):
        """(a) No S14+ events/configs → returns 13 (max is S13 config)."""
        # Confirm no test residual
        cnt_evt = _run(mongo.evenements.count_documents({"saison": {"$gt": 13}}))
        cnt_cfg = _run(mongo.saisons_config.count_documents({"saison": {"$gt": 13}}))
        assert cnt_evt == 0 and cnt_cfg == 0, "Residuals present, cannot baseline"

        assert _get_saison_courante(api) == 13
        assert _get_dashboard_saison(api) == 13

    def test_b_after_adding_s14_event_returns_14(self, api, mongo):
        """(b) After inserting an event with saison=14 → returns 14."""
        evt_id = _insert_event(mongo, 14, "s14_event")
        try:
            assert _get_saison_courante(api) == 14
            assert _get_dashboard_saison(api) == 14
        finally:
            _run(mongo.evenements.delete_one({"id": evt_id}))

    def test_c_after_deleting_s14_returns_13(self, api, mongo):
        """(c) After deletion of S14 event → back to 13."""
        # Ensure clean state
        _run(mongo.evenements.delete_many({"saison": {"$gt": 13}}))
        assert _get_saison_courante(api) == 13
        assert _get_dashboard_saison(api) == 13

    def test_d_s15_event_returns_15(self, api, mongo):
        """(d) With an S15 event → returns 15."""
        evt_id = _insert_event(mongo, 15, "s15_event")
        try:
            assert _get_saison_courante(api) == 15
            assert _get_dashboard_saison(api) == 15
        finally:
            _run(mongo.evenements.delete_one({"id": evt_id}))
        # Verify back to 13
        assert _get_saison_courante(api) == 13


class TestBornes:
    def test_saison_99_ignored(self, api, mongo):
        """Regression 1: saison=99 event should be ignored (capped at 20)."""
        evt_id = _insert_event(mongo, 99, "s99_event")
        cfg_id = str(uuid.uuid4())
        _run(mongo.saisons_config.insert_one({
            "id": f"{TAG}cfg99",
            "saison": 99,
            "nb_aperos": 0, "nb_repas": 0, "nb_anniversaires": 0,
        }))
        try:
            assert _get_saison_courante(api) == 13
            assert _get_dashboard_saison(api) == 13
        finally:
            _run(mongo.evenements.delete_one({"id": evt_id}))
            _run(mongo.saisons_config.delete_one({"id": f"{TAG}cfg99"}))


class TestNoYearDependency:
    def test_source_has_no_year_2012_arithmetic(self):
        """Regression 2: server.py must not use datetime.now().year - 2012."""
        with open("/app/backend/server.py") as f:
            src = f.read()
        assert "year - 2012" not in src
        assert "year-2012" not in src


class TestRegressions:
    def test_marc_antoine_37_blocked(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": "labague37"})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    @pytest.mark.parametrize("s", [21, 99, 100, 0, -1])
    def test_saisons_config_out_of_range_404(self, api, s):
        r = api.get(f"{BASE_URL}/api/saisons-config/{s}")
        assert r.status_code == 404


class TestFinalCleanup:
    def test_no_residual_events_gt_13(self, mongo):
        cnt = _run(mongo.evenements.count_documents({"saison": {"$gt": 13}}))
        assert cnt == 0, f"Residual events with saison>13: {cnt}"

    def test_no_residual_configs_gt_13(self, mongo):
        cnt = _run(mongo.saisons_config.count_documents({"saison": {"$gt": 13}}))
        assert cnt == 0, f"Residual configs with saison>13: {cnt}"

    def test_no_tag_residual(self, mongo):
        cnt_e = _run(mongo.evenements.count_documents({"objet": {"$regex": TAG}}))
        cnt_c = _run(mongo.saisons_config.count_documents({"id": {"$regex": TAG}}))
        assert cnt_e == 0 and cnt_c == 0, f"TEST_ITER16_ residual events={cnt_e} configs={cnt_c}"

    def test_baseline_saison_still_13(self, api):
        assert _get_saison_courante(api) == 13
        assert _get_dashboard_saison(api) == 13

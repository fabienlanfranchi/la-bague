"""
Tests for La Bague Impériale — Bugfix: pas de double comptage lorsque le Président
saisit manuellement une réponse (type='membre_manuel') pour un membre qui se
connectera ensuite à l'app.

Le fix: create_reponse_manuelle écrit désormais dans reponses_evenements
(source de vérité utilisée par le Dashboard membre) avec ajout_manuel=True.
Le membre voit sa réponse pré-remplie, peut la modifier, mais ne double-compte pas.

Covers:
- POST /api/reponses-manuelles (type=membre_manuel) → écrit dans reponses_evenements + presences_membres +1
- GET /api/reponses-sondages/{evt}/{membre} → retourne le doc avec ajout_manuel=True
- POST /api/reponses-sondages idempotent (delta=0 si pas de changement)
- POST /api/reponses-sondages présent→absent → delta=-1
- POST /api/reponses-sondages changement de menu uniquement → delta=0
- DELETE /api/reponses-manuelles/{id} cascade dans reponses_evenements
"""
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cigares-stats.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# -------------------- Direct DB helper (for cleanup + assertions) --------------------

@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


# -------------------- Auth --------------------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague1"}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def ludovic():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague18"}, timeout=30)
    assert r.status_code == 200, f"ludovic login failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data.get("access_token"), "member": data["member"]}


def auth(token):
    return {"Authorization": f"Bearer {token}"} if token else {}


# -------------------- Choose event --------------------

@pytest.fixture(scope="module")
def repas_event():
    r = requests.get(f"{API}/evenements", timeout=30)
    assert r.status_code == 200
    evts = r.json()
    # Prefer upcoming, else most recent repas
    repas = [e for e in evts if (e.get("type_sondage") or "").lower() == "repas"]
    upcoming = [e for e in repas if e.get("statut") != "terminé"]
    chosen = upcoming[0] if upcoming else repas[0]
    assert chosen is not None, "No repas event found"
    return chosen


# -------------------- Cleanup helper --------------------

def _clean(mongo, evt_id, membre_id):
    """Supprime toute trace de réponse pour ce couple (evt, membre)."""
    mongo.reponses_manuelles.delete_many({"evenement_id": evt_id, "membre_id": membre_id})
    mongo.reponses_evenements.delete_many({"evenement_id": evt_id, "membre_id": membre_id})
    mongo.reponses_sondages.delete_many({"evenement_id": evt_id, "membre_id": membre_id})
    mongo.presences_log.delete_many({"evenement_id": evt_id, "membre_id": membre_id})


def _get_presences_repas(mongo, membre_id, saison):
    doc = mongo.presences_membres.find_one({"membre_id": membre_id, "saison": saison})
    return (doc or {}).get("presences_repas", 0)


def _set_presences_repas(mongo, membre_id, saison, value):
    mongo.presences_membres.update_one(
        {"membre_id": membre_id, "saison": saison},
        {"$set": {"presences_repas": value}},
    )


# -------------------- Fixture per-test: snapshot + cleanup --------------------

@pytest.fixture
def snapshot(mongo, repas_event, ludovic):
    """Nettoie avant le test, snapshot la valeur initiale, restaure après."""
    evt_id = repas_event["id"]
    membre_id = ludovic["member"]["id"]
    saison = repas_event["saison"]

    _clean(mongo, evt_id, membre_id)
    initial = _get_presences_repas(mongo, membre_id, saison)

    yield {
        "evt_id": evt_id,
        "membre_id": membre_id,
        "saison": saison,
        "initial_presences_repas": initial,
    }

    # Teardown: restore
    _clean(mongo, evt_id, membre_id)
    if mongo.presences_membres.find_one({"membre_id": membre_id, "saison": saison}):
        _set_presences_repas(mongo, membre_id, saison, initial)


# ==================== TESTS ====================

class TestReponseManuelleNoDoublon:

    # -------- Scenario 1: pas de double comptage --------
    def test_1_manual_creates_evt_response_then_member_confirms_no_double(
        self, mongo, snapshot, admin_token, ludovic
    ):
        evt_id = snapshot["evt_id"]
        membre_id = snapshot["membre_id"]
        saison = snapshot["saison"]
        initial = snapshot["initial_presences_repas"]

        # 1.a. Admin POST reponses-manuelles
        payload = {
            "evenement_id": evt_id,
            "nom": ludovic["member"]["nom_complet"],
            "type": "membre_manuel",
            "membre_id": membre_id,
            "present": True,
            "choix_entree": "Salade",
            "choix_plat": "Bœuf bourguignon",
            "choix_dessert": "Tarte tatin",
        }
        r = requests.post(
            f"{API}/reponses-manuelles",
            json=payload,
            headers=auth(admin_token),
            timeout=30,
        )
        assert r.status_code == 200, f"POST manuelle failed: {r.status_code} {r.text}"

        # presences_repas +1
        after_manual = _get_presences_repas(mongo, membre_id, saison)
        assert after_manual == initial + 1, (
            f"presences_repas should be {initial+1} after manual add, got {after_manual}"
        )

        # 1.b. Vérifier reponses_evenements contient bien ajout_manuel=True
        evt_doc = mongo.reponses_evenements.find_one({"evenement_id": evt_id, "membre_id": membre_id})
        assert evt_doc is not None, "reponses_evenements doc missing after manual add"
        assert evt_doc.get("present") is True
        assert evt_doc.get("ajout_manuel") is True
        assert evt_doc.get("choix_plat") == "Bœuf bourguignon"

        # 1.c. GET /api/reponses-sondages/{evt}/{membre} — côté membre
        r = requests.get(
            f"{API}/reponses-sondages/{evt_id}/{membre_id}",
            headers=auth(ludovic["token"]),
            timeout=30,
        )
        assert r.status_code == 200, f"GET reponse-sondages failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("present") is True
        assert data.get("choix_entree") == "Salade"
        assert data.get("choix_plat") == "Bœuf bourguignon"
        assert data.get("choix_dessert") == "Tarte tatin"
        assert data.get("ajout_manuel") is True, f"ajout_manuel marker missing: {data}"

        # 1.d. Ludovic re-poste la même réponse (comme s'il confirmait dans l'app)
        confirm_payload = {
            "evenement_id": evt_id,
            "membre_id": membre_id,
            "present": True,
            "choix_entree": "Salade",
            "choix_plat": "Bœuf bourguignon",
            "choix_dessert": "Tarte tatin",
        }
        r = requests.post(
            f"{API}/reponses-sondages",
            json=confirm_payload,
            headers=auth(ludovic["token"]),
            timeout=30,
        )
        assert r.status_code == 200, f"POST sondage failed: {r.status_code} {r.text}"

        # presences_repas doit rester à initial+1 (pas de double comptage)
        after_confirm = _get_presences_repas(mongo, membre_id, saison)
        assert after_confirm == initial + 1, (
            f"DOUBLE COUNT BUG: expected {initial+1}, got {after_confirm} (Δ={after_confirm-initial})"
        )

    # -------- Scenario 2: présent → absent --------
    def test_2_change_to_absent_decrements(
        self, mongo, snapshot, admin_token, ludovic
    ):
        evt_id = snapshot["evt_id"]
        membre_id = snapshot["membre_id"]
        saison = snapshot["saison"]
        initial = snapshot["initial_presences_repas"]

        # Setup: admin ajoute la réponse manuelle → present=True
        requests.post(
            f"{API}/reponses-manuelles",
            json={
                "evenement_id": evt_id,
                "nom": ludovic["member"]["nom_complet"],
                "type": "membre_manuel",
                "membre_id": membre_id,
                "present": True,
                "choix_entree": "E1",
                "choix_plat": "P1",
                "choix_dessert": "D1",
            },
            headers=auth(admin_token),
            timeout=30,
        )
        assert _get_presences_repas(mongo, membre_id, saison) == initial + 1

        # Ludovic passe absent
        r = requests.post(
            f"{API}/reponses-sondages",
            json={
                "evenement_id": evt_id,
                "membre_id": membre_id,
                "present": False,
                "choix_entree": None,
                "choix_plat": None,
                "choix_dessert": None,
            },
            headers=auth(ludovic["token"]),
            timeout=30,
        )
        assert r.status_code == 200

        after = _get_presences_repas(mongo, membre_id, saison)
        assert after == initial, (
            f"After present→absent expected {initial}, got {after}"
        )

    # -------- Scenario 3: change only menu → no delta --------
    def test_3_change_only_menu_no_delta(
        self, mongo, snapshot, admin_token, ludovic
    ):
        evt_id = snapshot["evt_id"]
        membre_id = snapshot["membre_id"]
        saison = snapshot["saison"]
        initial = snapshot["initial_presences_repas"]

        # Setup: réponse manuelle present=True
        requests.post(
            f"{API}/reponses-manuelles",
            json={
                "evenement_id": evt_id,
                "nom": ludovic["member"]["nom_complet"],
                "type": "membre_manuel",
                "membre_id": membre_id,
                "present": True,
                "choix_entree": "E1",
                "choix_plat": "P1",
                "choix_dessert": "D1",
            },
            headers=auth(admin_token),
            timeout=30,
        )
        assert _get_presences_repas(mongo, membre_id, saison) == initial + 1

        # Ludovic change juste le plat (reste present=True)
        r = requests.post(
            f"{API}/reponses-sondages",
            json={
                "evenement_id": evt_id,
                "membre_id": membre_id,
                "present": True,
                "choix_entree": "E1",
                "choix_plat": "P2-NEW",
                "choix_dessert": "D1",
            },
            headers=auth(ludovic["token"]),
            timeout=30,
        )
        assert r.status_code == 200

        after = _get_presences_repas(mongo, membre_id, saison)
        assert after == initial + 1, (
            f"Menu-only change should keep presences unchanged, expected {initial+1}, got {after}"
        )

        # Vérifier que le plat a bien changé dans reponses_evenements
        evt_doc = mongo.reponses_evenements.find_one({"evenement_id": evt_id, "membre_id": membre_id})
        assert evt_doc.get("choix_plat") == "P2-NEW"

    # -------- Scenario 4: DELETE reponses-manuelles cascade --------
    def test_4_delete_manuelle_cascades_reponses_evenements(
        self, mongo, snapshot, admin_token, ludovic
    ):
        evt_id = snapshot["evt_id"]
        membre_id = snapshot["membre_id"]

        # POST manual
        r = requests.post(
            f"{API}/reponses-manuelles",
            json={
                "evenement_id": evt_id,
                "nom": ludovic["member"]["nom_complet"],
                "type": "membre_manuel",
                "membre_id": membre_id,
                "present": True,
                "choix_entree": "E1",
                "choix_plat": "P1",
                "choix_dessert": "D1",
            },
            headers=auth(admin_token),
            timeout=30,
        )
        assert r.status_code == 200
        rm_id = r.json()["reponse"]["id"]

        # Vérifier le doc dans reponses_evenements existe
        assert mongo.reponses_evenements.find_one(
            {"evenement_id": evt_id, "membre_id": membre_id, "ajout_manuel": True}
        ) is not None

        # DELETE /reponses-manuelles/{id}
        r = requests.delete(
            f"{API}/reponses-manuelles/{rm_id}",
            headers=auth(admin_token),
            timeout=30,
        )
        assert r.status_code == 200, f"DELETE manuelle failed: {r.status_code} {r.text}"

        # Vérifier cascade: reponses_evenements ne doit plus contenir l'entrée ajout_manuel
        remaining = mongo.reponses_evenements.find_one(
            {"evenement_id": evt_id, "membre_id": membre_id, "ajout_manuel": True}
        )
        assert remaining is None, f"reponses_evenements still has ajout_manuel entry: {remaining}"

        # Idem reponses_sondages
        assert mongo.reponses_sondages.find_one(
            {"evenement_id": evt_id, "membre_id": membre_id, "ajout_manuel": True}
        ) is None

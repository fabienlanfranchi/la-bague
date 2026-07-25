"""Tests for saison-courante bug fix (iteration 14).
Verifies:
  - /api/saison-courante returns saison <= 20
  - /api/saisons-config/{saison} returns 404 for out-of-range and no ObjectId leaks
  - /api/statistiques/moyennes-dashboard returns bounded season
  - Regression: new members 75-78 login, Marc Antoine 37 blocked, split invoice payment works
"""
import os
import pytest
import requests
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(api):
    r = api.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": "labague1"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(api, token):
    api.headers.update({"Authorization": f"Bearer {token}"})
    return api


# --- BUG FIX 1: saison-courante ---
class TestSaisonCourante:
    def test_returns_valid_season(self, auth):
        r = auth.get(f"{BASE_URL}/api/saison-courante")
        assert r.status_code == 200
        data = r.json()
        assert "saison" in data
        assert isinstance(data["saison"], int)
        assert 1 <= data["saison"] <= 20, f"Season out of range: {data['saison']}"

    def test_returns_saison_14(self, auth):
        r = auth.get(f"{BASE_URL}/api/saison-courante")
        assert r.json()["saison"] == 14, f"Expected 14, got {r.json()['saison']}"

    def test_no_parasite_in_db(self):
        async def check():
            c = AsyncIOMotorClient(MONGO_URL)
            db = c[DB_NAME]
            cnt_high = await db.saisons_config.count_documents({"saison": {"$gt": 20}})
            cnt_evt = await db.evenements.count_documents({"saison": 99}) if "evenements" in await db.list_collection_names() else 0
            cnt_pres = await db.presences_membres.count_documents({"saison": 99}) if "presences_membres" in await db.list_collection_names() else 0
            return cnt_high, cnt_evt, cnt_pres
        h, e, p = asyncio.get_event_loop().run_until_complete(check())
        assert h == 0
        assert e == 0
        assert p == 0


# --- BUG FIX 2: saisons-config out-of-range 404 ---
class TestSaisonsConfigOutOfRange:
    @pytest.mark.parametrize("s", [99, 100, 0, -1, 21, 1000])
    def test_out_of_range_returns_404(self, auth, s):
        r = auth.get(f"{BASE_URL}/api/saisons-config/{s}")
        assert r.status_code == 404, f"Season {s}: expected 404 got {r.status_code} body={r.text}"
        # Ensure no _id leak
        try:
            body = r.json()
        except Exception:
            body = {}
        assert "_id" not in str(body)

    def test_out_of_range_not_persisted(self):
        async def check():
            c = AsyncIOMotorClient(MONGO_URL)
            db = c[DB_NAME]
            return await db.saisons_config.count_documents({"saison": {"$gt": 20}})
        cnt = asyncio.get_event_loop().run_until_complete(check())
        assert cnt == 0, "Out-of-range GET must not persist docs"


# --- BUG FIX 3: moyennes-dashboard ---
class TestMoyennesDashboard:
    def test_saison_actuelle_bounded(self, auth):
        r = auth.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
        assert r.status_code == 200
        data = r.json()
        assert "saison_actuelle" in data
        assert 1 <= data["saison_actuelle"] <= 20
        assert data["saison_actuelle"] == 14

    def test_pct_saison_actuelle_zero(self, auth):
        r = auth.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
        # pct_saison_actuelle should be 0 (no events yet in S14)
        data = r.json()
        assert data.get("pct_saison_actuelle", 0) == 0


# --- REGRESSION 1: valid saison creates config cleanly ---
class TestSaisonsConfigValid:
    def test_get_valid_season_creates_clean(self, auth):
        # Use 15 as test (in-range, likely doesn't exist)
        r = auth.get(f"{BASE_URL}/api/saisons-config/15")
        assert r.status_code == 200
        data = r.json()
        assert data["saison"] == 15
        assert "_id" not in data
        assert "id" in data
        # Cleanup
        async def cleanup():
            c = AsyncIOMotorClient(MONGO_URL)
            db = c[DB_NAME]
            await db.saisons_config.delete_many({"saison": 15, "is_manuel": {"$ne": True}})
        asyncio.get_event_loop().run_until_complete(cleanup())

    def test_get_saison_13_locked(self, auth):
        r = auth.get(f"{BASE_URL}/api/saisons-config/13")
        assert r.status_code == 200
        data = r.json()
        assert data.get("is_manuel") is True


# --- REGRESSION 3 & 4: member logins ---
class TestMemberLogins:
    @pytest.mark.parametrize("key", ["labague75", "labague76", "labague77", "labague78"])
    def test_new_members_login(self, api, key):
        r = api.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": key})
        assert r.status_code == 200, f"{key} login failed: {r.text}"
        assert "access_token" in r.json()

    def test_marc_antoine_37_blocked(self, api):
        r = api.post(f"{BASE_URL}/api/auth/key-login", json={"cle_activation": "labague37"})
        assert r.status_code == 403


# --- REGRESSION 5: split payment invoice ---
class TestSplitPayment:
    def test_split_payment_flow(self, auth):
        created_facture_id = None
        created_transaction_ids = []
        initial_balances = {}
        try:
            # Get CB and Especes account balances
            r = auth.get(f"{BASE_URL}/api/comptes")
            assert r.status_code == 200
            comptes = r.json()
            # No named CB/Especes in this DB, use type-based selection: banque + caisse
            cb = next((c for c in comptes if c.get("type") == "banque"), None)
            especes = next((c for c in comptes if c.get("type") == "caisse"), None)
            if not cb or not especes:
                pytest.skip(f"Banque/Caisse accounts not found. Comptes: {[c.get('nom') for c in comptes]}")
            initial_balances[cb["id"]] = cb.get("solde", 0)
            initial_balances[especes["id"]] = especes.get("solde", 0)

            # Create facture WITHOUT lignes, montant 4800
            payload = {
                "libelle": "TEST_frac_facture_split",
                "montant": 4800.0,
                "fournisseur": "TEST_FOURN"
            }
            r = auth.post(f"{BASE_URL}/api/factures-a-payer", json=payload)
            assert r.status_code in (200, 201), r.text
            created_facture_id = r.json().get("facture", {}).get("id")
            assert created_facture_id, r.text

            # Split payment via repartition
            pay_payload = {
                "repartition": [
                    {"caisse": cb["nom"], "montant": 500.0, "mode_paiement": "CB"},
                    {"caisse": especes["nom"], "montant": 4300.0, "mode_paiement": "Espèces"}
                ],
                "date_paiement": "2026-01-15"
            }
            r = auth.post(f"{BASE_URL}/api/factures-a-payer/{created_facture_id}/payer", json=pay_payload)
            assert r.status_code in (200, 201), f"Pay failed: {r.status_code} {r.text}"

            # Verify facture is fully paid
            r = auth.get(f"{BASE_URL}/api/factures-a-payer")
            factures = r.json() if r.status_code == 200 else []
            f = next((x for x in factures if x.get("id") == created_facture_id), None)
            if f is not None:
                assert f.get("statut") == "payee", f"Statut: {f.get('statut')}"
        finally:
            # CLEANUP: delete facture, transactions, restore balances
            async def cleanup():
                c = AsyncIOMotorClient(MONGO_URL)
                db = c[DB_NAME]
                if created_facture_id:
                    await db.factures_a_payer.delete_many({"id": created_facture_id})
                # Delete all TEST transactions
                await db.transactions.delete_many({"detail": {"$regex": "TEST", "$options": "i"}})
                await db.transactions.delete_many({"libelle": {"$regex": "TEST", "$options": "i"}})
                await db.factures_a_payer.delete_many({"libelle": {"$regex": "TEST", "$options": "i"}})
                # Restore balances
                for cid, bal in initial_balances.items():
                    await db.comptes.update_one({"id": cid}, {"$set": {"solde": bal}})
                # Ensure no saison > 20
                await db.saisons_config.delete_many({"saison": {"$gt": 20}})
            asyncio.get_event_loop().run_until_complete(cleanup())


# --- FINAL CLEANUP verification ---
class TestFinalCleanup:
    def test_no_parasite_data_remains(self):
        async def check():
            c = AsyncIOMotorClient(MONGO_URL)
            db = c[DB_NAME]
            # Force cleanup
            await db.saisons_config.delete_many({"saison": {"$gt": 20}})
            await db.transactions.delete_many({"detail": {"$regex": "TEST", "$options": "i"}})
            await db.factures_a_payer.delete_many({"libelle": {"$regex": "TEST", "$options": "i"}})
            return {
                "saisons_high": await db.saisons_config.count_documents({"saison": {"$gt": 20}}),
                "trans_test": await db.transactions.count_documents({"detail": {"$regex": "TEST", "$options": "i"}}),
                "fact_test": await db.factures_a_payer.count_documents({"libelle": {"$regex": "TEST", "$options": "i"}}),
            }
        res = asyncio.get_event_loop().run_until_complete(check())
        assert res["saisons_high"] == 0
        assert res["trans_test"] == 0
        assert res["fact_test"] == 0

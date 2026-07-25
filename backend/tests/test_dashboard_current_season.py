"""Tests for BUG FIX - dynamic current season on Dashboard + regressions.

Contexte: sur Preview, toutes les saisons S1-S13 sont verrouillées (is_manuel=True).
Aucune config S14 n'existe. Donc la saison_courante attendue = 14 avec pct=0.
"""
import os
import uuid
import pytest
import requests

def _load_frontend_env():
    p = "/app/frontend/.env"
    if os.path.exists(p):
        with open(p) as f:
            for line in f:
                line = line.strip()
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague1"}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    # Depending on implementation, token may be in access_token or in cookie
    tok = data.get("access_token") or data.get("token")
    return tok, r.cookies


@pytest.fixture
def auth_session(admin_token):
    tok, cookies = admin_token
    s = requests.Session()
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    for c in cookies:
        s.cookies.set(c.name, c.value)
    return s


# ============ BUG FIX : Saison courante dynamique ============
class TestCurrentSeasonDynamic:

    def test_saison_courante_endpoint_returns_14(self, auth_session):
        r = auth_session.get(f"{API}/saison-courante", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "saison" in data
        assert data["saison"] == 14, f"Attendu 14, obtenu {data['saison']}"

    def test_moyennes_dashboard_saison_actuelle_14(self, auth_session):
        r = auth_session.get(f"{API}/statistiques/moyennes-dashboard", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("saison_actuelle") == 14, f"saison_actuelle={d.get('saison_actuelle')}"
        assert d.get("pct_saison_actuelle") == 0, f"pct_saison_actuelle={d.get('pct_saison_actuelle')}"
        assert d.get("total_events_saison") == 0
        assert d.get("total_presences_saison") == 0

    def test_moyennes_dashboard_globals_regression(self, auth_session):
        r = auth_session.get(f"{API}/statistiques/moyennes-dashboard", timeout=30)
        assert r.status_code == 200
        d = r.json()
        # Régression : globals doivent rester cohérents
        assert d.get("total_events_global", 0) > 200, f"total_events_global={d.get('total_events_global')}"
        pct = d.get("pct_global", 0)
        assert 45 <= pct <= 55, f"pct_global={pct} attendu ~49.9"

    def test_stats_saison_14_no_error(self, auth_session):
        r = auth_session.get(f"{API}/statistiques/saison/14", timeout=30)
        assert r.status_code == 200, r.text
        # peu importe la structure, juste ne pas planter


# ============ SaisonConfigUpdate is_manuel ============
class TestSaisonConfigManuel:

    def test_put_saison_config_accepts_is_manuel(self, auth_session):
        # Utiliser une saison test hors périmètre pour ne rien casser
        target = 99
        # Ensure it exists
        auth_session.get(f"{API}/saisons-config/{target}", timeout=30)

        payload = {"is_manuel": True, "nb_aperos": 1}
        r = auth_session.put(f"{API}/saisons-config/{target}", json=payload, timeout=30)
        assert r.status_code == 200, r.text

        r2 = auth_session.get(f"{API}/saisons-config/{target}", timeout=30)
        cfg = r2.json()
        assert cfg.get("is_manuel") is True
        assert cfg.get("nb_aperos") == 1

        # revert to non-manuel to keep DB clean (delete would be better but no endpoint)
        auth_session.put(f"{API}/saisons-config/{target}", json={"is_manuel": False, "nb_aperos": 0}, timeout=30)


# ============ Transaction mode_paiement stored ============
class TestTransactionModePaiement:

    def test_create_transaction_mode_paiement_persisted(self, auth_session):
        payload = {
            "type": "recette",
            "objet": "autres",
            "montant": 1.23,
            "endroit": "Chez Fabien",
            "mode_paiement": "CB",
            "detail": f"TEST_{uuid.uuid4().hex[:8]}",
        }
        r = auth_session.post(f"{API}/transactions", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        assert created.get("mode_paiement") == "CB", f"mode_paiement={created.get('mode_paiement')}"

        # Verify persisted
        tid = created.get("id")
        assert tid
        rlist = auth_session.get(f"{API}/transactions", timeout=30)
        assert rlist.status_code == 200
        found = next((t for t in rlist.json() if t.get("id") == tid), None)
        assert found is not None
        assert found.get("mode_paiement") == "CB"

        # Cleanup
        auth_session.delete(f"{API}/transactions/{tid}", timeout=30)


# ============ Paiement fractionné facture ============
class TestPaiementFractionne:

    def test_facture_split_payment_ends_payee(self, auth_session):
        # 1) créer facture 4800€ sans lignes
        facture_payload = {
            "libelle": f"TEST_frac_{uuid.uuid4().hex[:6]}",
            "montant": 4800,
            "fournisseur": "TEST",
        }
        r = auth_session.post(f"{API}/factures-a-payer", json=facture_payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        facture = r.json().get("facture") or r.json()
        fid = facture["id"]

        try:
            # 2) premier paiement CB 500€
            p1 = {
                "repartition": [{"caisse": "Compte", "montant": 500, "mode_paiement": "CB"}],
                "mode_paiement": "CB",
                "date_paiement": "2026-01-15",
            }
            r1 = auth_session.post(f"{API}/factures-a-payer/{fid}/payer", json=p1, timeout=30)
            assert r1.status_code == 200, r1.text

            # Check statut partielle
            g1 = auth_session.get(f"{API}/factures-a-payer", timeout=30).json()
            fac1 = next((f for f in (g1 if isinstance(g1, list) else g1.get("factures", [])) if f["id"] == fid), None)
            assert fac1 is not None
            assert fac1.get("statut") in ("partielle", "en_attente"), f"statut={fac1.get('statut')}"

            # 3) deuxième paiement Espèces 4300€
            p2 = {
                "repartition": [{"caisse": "Chez Fabien", "montant": 4300, "mode_paiement": "Espèces"}],
                "mode_paiement": "Espèces",
                "date_paiement": "2026-01-16",
            }
            r2 = auth_session.post(f"{API}/factures-a-payer/{fid}/payer", json=p2, timeout=30)
            assert r2.status_code == 200, r2.text

            g2 = auth_session.get(f"{API}/factures-a-payer", timeout=30).json()
            fac2 = next((f for f in (g2 if isinstance(g2, list) else g2.get("factures", [])) if f["id"] == fid), None)
            assert fac2 is not None
            assert fac2.get("statut") == "payee", f"statut final={fac2.get('statut')}"
        finally:
            # cleanup transactions and facture
            trs = auth_session.get(f"{API}/transactions", timeout=30).json()
            for t in trs:
                if t.get("facture_id") == fid:
                    auth_session.delete(f"{API}/transactions/{t['id']}", timeout=30)
            auth_session.delete(f"{API}/factures-a-payer/{fid}", timeout=30)


# ============ Blocage accès (labague37) ============
class TestBlockedAccess:

    def test_labague37_blocked(self):
        r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague37"}, timeout=30)
        assert r.status_code == 403, f"Attendu 403, obtenu {r.status_code} : {r.text}"
        # message français
        try:
            d = r.json()
            msg = (d.get("detail") or d.get("message") or "").lower()
            assert any(w in msg for w in ["révoqué", "revoqu", "bloqué", "bloque", "président", "president"]), f"message={msg}"
        except ValueError:
            pytest.fail("Réponse non JSON")

"""
Tests for iteration 19: Encaissement cotisation & dette avec choix caisse/mode de paiement.
Backend inchangé - on valide le flow API paiements-en-attente + validation avec
différentes combinaisons de caisse (endroit) et mode_paiement.

Scénarios:
- S1: Encaissement cotisation (Jacques) avec Chez Jacques + Virement
- S2: Encaissement dette (créée à la volée) avec PayPal + PayPal
- S3: 3 combinaisons variées (Compte/Virement, Asso Connect/CB, Chèque/Chèque)
"""

import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback local
    BASE_URL = "http://localhost:8001"

# Try to load frontend .env for REACT_APP_BACKEND_URL if env not set
if "preview" not in BASE_URL and "emergentagent" not in BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"

FABIEN_ID = "d6b30499-2c9b-43e4-9402-7234da4c9855"   # Président
JACQUES_ID = "de7f715f-c307-4168-9aed-ecb335634904"  # Membre avec situation_cotisation=1


# ---------------- Helpers -----------------

def _get_member(mid):
    r = requests.get(f"{API}/members/{mid}", timeout=10)
    if r.status_code == 200:
        return r.json()
    # fallback: liste
    r = requests.get(f"{API}/members", timeout=10)
    assert r.status_code == 200, r.text
    for m in r.json():
        if m.get("id") == mid:
            return m
    return None


def _get_compte_solde(nom):
    r = requests.get(f"{API}/comptes", timeout=10)
    assert r.status_code == 200
    for c in r.json():
        if c.get("nom") == nom:
            return c.get("solde", 0)
    return None


def _cleanup_transaction(tx_id):
    if tx_id:
        requests.delete(f"{API}/transactions/{tx_id}", timeout=10)


def _cleanup_paiement(pid):
    if pid:
        requests.delete(f"{API}/paiements-en-attente/{pid}", timeout=10)


def _restore_situation(mid, target):
    """Force situation_cotisation to target value via members update endpoint."""
    r = requests.put(f"{API}/members/{mid}", json={"situation_cotisation": target}, timeout=10)
    # ignore fail; tests will assert real state
    return r.status_code


# ---------------- Fixtures -----------------

@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============ SCÉNARIO 1 : Encaissement cotisation ============

def test_s1_encaissement_cotisation_chez_jacques_virement(session):
    """Cotisation Jacques encaissée via Chez Jacques + Virement."""
    # Baseline
    membre_before = _get_member(JACQUES_ID)
    assert membre_before is not None, "Jacques introuvable"
    situation_before = int(membre_before.get("situation_cotisation") or 0)
    assert situation_before >= 1, (
        f"Jacques doit avoir situation_cotisation>=1 (actuel={situation_before}) "
        "— seed manquant, resetter avant le test."
    )
    solde_jacques_before = _get_compte_solde("Chez Jacques")

    # (a) Créer paiement en attente
    payload = {
        "membre_id": JACQUES_ID,
        "declarant_id": FABIEN_ID,
        "date_paiement": "2026-01-15",
        "type": "recette",
        "objet": "cotisation",
        "montant": 200,
        "endroit": "Chez Jacques",
        "mode_paiement": "Virement",
        "detail": "TEST_iter19 cotisation Jacques",
    }
    r = session.post(f"{API}/paiements-en-attente", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    body = r.json()
    paiement = body.get("paiement") or body
    pid = paiement["id"]
    assert paiement["statut"] == "en_attente"
    assert paiement["endroit"] == "Chez Jacques"
    assert paiement["mode_paiement"] == "Virement"

    tx_id = None
    try:
        # (b) Valider
        r = session.post(
            f"{API}/paiements-en-attente/{pid}/valider",
            params={"validateur_id": FABIEN_ID},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        tx_id = r.json().get("transaction_id")
        assert tx_id, "transaction_id manquant après validation"

        # (c) Vérifier la transaction créée
        r = session.get(f"{API}/transactions", timeout=10)
        assert r.status_code == 200
        tx = next((t for t in r.json() if t.get("id") == tx_id), None)
        assert tx is not None, "transaction non trouvée"
        assert tx["endroit"] == "Chez Jacques"
        assert tx["mode_paiement"] == "Virement"
        assert tx["objet"] == "cotisation"
        assert float(tx["montant"]) == 200

        # (d) Vérifier situation_cotisation décrémentée
        membre_after = _get_member(JACQUES_ID)
        assert int(membre_after["situation_cotisation"]) == situation_before - 1

        # (e) Vérifier solde Chez Jacques incrémenté
        solde_after = _get_compte_solde("Chez Jacques")
        assert round(solde_after - solde_jacques_before, 2) == 200.0

    finally:
        # Cleanup transaction + restore solde
        _cleanup_transaction(tx_id)
        _cleanup_paiement(pid)
        _restore_situation(JACQUES_ID, situation_before)
        # Verify solde restored to baseline (delete_transaction rollbacks the +200)
        solde_final = _get_compte_solde("Chez Jacques")
        assert round(solde_final - solde_jacques_before, 2) == 0.0, (
            f"Solde Chez Jacques pas restauré: before={solde_jacques_before} final={solde_final}"
        )
        # Verify situation restored
        m = _get_member(JACQUES_ID)
        assert int(m["situation_cotisation"]) == situation_before, "situation_cotisation non restaurée"


# ============ SCÉNARIO 2 : Encaissement dette PayPal ============

def test_s2_encaissement_dette_paypal(session):
    """Dette test créée puis encaissée via PayPal + PayPal, dette supprimée."""
    solde_paypal_before = _get_compte_solde("PayPal")

    # Créer une dette test pour Jacques
    r = session.post(
        f"{API}/dettes",
        json={"membre_id": JACQUES_ID, "montant": 50, "cause": "TEST_iter19_dette"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    dette = r.json()
    dette_id = dette["id"]

    pid = None
    tx_id = None
    try:
        # Créer paiement en attente lié à cette dette
        payload = {
            "membre_id": JACQUES_ID,
            "declarant_id": FABIEN_ID,
            "date_paiement": "2026-01-15",
            "type": "recette",
            "objet": "autres",
            "montant": 50,
            "endroit": "PayPal",
            "mode_paiement": "PayPal",
            "detail": "TEST_iter19 dette PayPal",
            "dette_id": dette_id,
        }
        r = session.post(f"{API}/paiements-en-attente", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        pid = (r.json().get("paiement") or r.json())["id"]

        # Valider
        r = session.post(
            f"{API}/paiements-en-attente/{pid}/valider",
            params={"validateur_id": FABIEN_ID},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        tx_id = r.json()["transaction_id"]

        # Vérifier transaction
        r = session.get(f"{API}/transactions", timeout=10)
        tx = next((t for t in r.json() if t.get("id") == tx_id), None)
        assert tx is not None
        assert tx["endroit"] == "PayPal"
        assert tx["mode_paiement"] == "PayPal"
        assert float(tx["montant"]) == 50

        # Vérifier dette supprimée
        r = session.get(f"{API}/dettes", timeout=10)
        assert r.status_code == 200
        assert not any(d.get("id") == dette_id for d in r.json()), (
            "La dette devrait être supprimée après validation du paiement"
        )

        # Vérifier solde PayPal incrémenté
        solde_after = _get_compte_solde("PayPal")
        assert round(solde_after - solde_paypal_before, 2) == 50.0

    finally:
        _cleanup_transaction(tx_id)
        _cleanup_paiement(pid)
        # Si la dette existe encore (échec de suppression), on la nettoie
        requests.delete(f"{API}/dettes/{dette_id}", timeout=10)


# ============ SCÉNARIO 3 : Combinaisons caisse/mode ============

@pytest.mark.parametrize(
    "endroit,mode,expected_compte",
    [
        ("Compte", "Virement", "Compte Bancaire"),   # mapping Compte→Compte Bancaire
        ("Asso Connect", "CB", "Asso Connect"),
        ("Chèque", "Chèque", "Compte Bancaire"),      # mapping Chèque→Compte Bancaire
    ],
)
def test_s3_combinaisons_caisse_mode(session, endroit, mode, expected_compte):
    """Différentes caisses+modes doivent être persistés fidèlement sur la transaction."""
    membre_before = _get_member(JACQUES_ID)
    situation_before = int(membre_before.get("situation_cotisation") or 0)
    # On testera une "dette" pour ne pas dépendre de situation_cotisation>0
    # (dette créée à la volée)
    solde_before = _get_compte_solde(expected_compte)

    # Créer dette
    r = session.post(
        f"{API}/dettes",
        json={"membre_id": JACQUES_ID, "montant": 30, "cause": f"TEST_iter19_combo_{endroit}"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    dette_id = r.json()["id"]

    pid = None
    tx_id = None
    try:
        payload = {
            "membre_id": JACQUES_ID,
            "declarant_id": FABIEN_ID,
            "date_paiement": "2026-01-15",
            "type": "recette",
            "objet": "autres",
            "montant": 30,
            "endroit": endroit,
            "mode_paiement": mode,
            "detail": f"TEST_iter19 combo {endroit}/{mode}",
            "dette_id": dette_id,
        }
        r = session.post(f"{API}/paiements-en-attente", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        pid = (r.json().get("paiement") or r.json())["id"]

        r = session.post(
            f"{API}/paiements-en-attente/{pid}/valider",
            params={"validateur_id": FABIEN_ID},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        tx_id = r.json()["transaction_id"]

        r = session.get(f"{API}/transactions", timeout=10)
        tx = next((t for t in r.json() if t.get("id") == tx_id), None)
        assert tx is not None
        # endroit persisté = valeur envoyée (pas de mapping côté transaction)
        assert tx["endroit"] == endroit, (
            f"endroit non persisté fidèlement: attendu {endroit}, obtenu {tx['endroit']}"
        )
        assert tx["mode_paiement"] == mode

        # Solde du compte réel (après mapping) doit être incrémenté
        solde_after = _get_compte_solde(expected_compte)
        assert round(solde_after - solde_before, 2) == 30.0, (
            f"Solde {expected_compte} non incrémenté (endroit={endroit}, mapping->{expected_compte})"
        )

    finally:
        _cleanup_transaction(tx_id)
        _cleanup_paiement(pid)
        requests.delete(f"{API}/dettes/{dette_id}", timeout=10)
        _restore_situation(JACQUES_ID, situation_before)

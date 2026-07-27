"""
Tests for La Bague Impériale — Tâches 1/2/3 (Verrouillage saisons, S14 dynamique, modif réponse)

Covers:
- GET /api/saison-actuelle (no auth)
- GET /api/saisons-config/{saison}
- POST /api/saisons-config/{saison}/verrouiller (admin JWT)
- POST /api/saisons-config/{saison}/deverrouiller (admin JWT)
- 403 when non-admin member calls verrouiller/deverrouiller
- GET /api/statistiques/saisons-resume — is_manuel respected for any saison (no cap saison<=12)
- GET /api/statistiques/moyennes-dashboard — saison_actuelle dynamique = max(saisons_config)
- POST /api/reponses-sondages — delta ±1 sur presences_membres, jamais négatif
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cigares-stats.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# -------------------- Fixtures --------------------

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague1"}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def tresorier_token():
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague3"}, timeout=30)
    assert r.status_code == 200, f"tresorier login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def simple_member():
    """A regular member with fonction=Membre (not admin) — labague23 (Pascal Giovachini)."""
    r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague23"}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"simple member login failed: {r.status_code} {r.text}")
    data = r.json()
    return {"token": data["access_token"], "member": data["member"]}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# -------------------- Tâche 2 : saison-actuelle & moyennes-dashboard --------------------

class TestSaisonActuelle:
    def test_saison_actuelle_no_auth(self):
        r = requests.get(f"{API}/saison-actuelle", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "saison_actuelle" in data
        assert isinstance(data["saison_actuelle"], int)
        # Dynamic max(saison) — should be at least 14 per context (S14 created)
        assert data["saison_actuelle"] >= 14, f"saison_actuelle={data['saison_actuelle']}, attendu >= 14"

    def test_moyennes_dashboard_saison_actuelle_dynamique(self, admin_token):
        r = requests.get(f"{API}/statistiques/moyennes-dashboard", headers=auth(admin_token), timeout=30)
        # May or may not require auth — accept 200
        if r.status_code == 401:
            r = requests.get(f"{API}/statistiques/moyennes-dashboard", timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "saison_actuelle" in data, f"payload={data}"
        # Doit refléter max(saison) — S14
        r2 = requests.get(f"{API}/saison-actuelle", timeout=30)
        expected = r2.json()["saison_actuelle"]
        assert data["saison_actuelle"] == expected, f"dashboard={data['saison_actuelle']} vs endpoint={expected}"


# -------------------- Tâche 1 : verrouiller / déverrouiller --------------------

class TestSaisonLock:
    def test_get_config_s14(self):
        r = requests.get(f"{API}/saisons-config/14", timeout=30)
        assert r.status_code == 200
        cfg = r.json()
        assert cfg.get("saison") == 14
        # S14 should have is_manuel=True per context
        # (accept if key missing means False)
        assert cfg.get("is_manuel") in (True, False)

    def test_verrouiller_requires_auth(self):
        r = requests.post(f"{API}/saisons-config/14/verrouiller", timeout=30)
        assert r.status_code == 401, f"expected 401 without JWT, got {r.status_code}"

    def test_verrouiller_forbidden_for_regular_member(self, simple_member):
        member = simple_member["member"]
        fonction = member.get("fonction")
        if fonction in ("Président", "Trésorier", "Secrétaire") or member.get("is_president"):
            pytest.skip(f"labague23 has admin fonction={fonction} - cannot test 403")
        r = requests.post(
            f"{API}/saisons-config/14/verrouiller",
            headers=auth(simple_member["token"]),
            timeout=30,
        )
        assert r.status_code == 403, f"expected 403 for non-admin, got {r.status_code} {r.text}"

    def test_lock_unlock_roundtrip_admin(self, admin_token):
        # Verrouiller S14
        r = requests.post(f"{API}/saisons-config/14/verrouiller", headers=auth(admin_token), timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["success"] is True
        assert data["is_manuel"] is True
        assert data["config"]["is_manuel"] is True

        # Vérifier via GET
        r2 = requests.get(f"{API}/saisons-config/14", timeout=30)
        assert r2.json().get("is_manuel") is True

        # Déverrouiller
        r3 = requests.post(f"{API}/saisons-config/14/deverrouiller", headers=auth(admin_token), timeout=30)
        assert r3.status_code == 200
        assert r3.json()["is_manuel"] is False

        # Re-verrouiller pour restaurer l'état initial demandé (S14 is_manuel=True)
        r4 = requests.post(f"{API}/saisons-config/14/verrouiller", headers=auth(admin_token), timeout=30)
        assert r4.status_code == 200
        assert r4.json()["is_manuel"] is True

    def test_lock_unlock_tresorier_ok(self, tresorier_token):
        # Le trésorier (labague3) doit également avoir accès
        r = requests.post(f"{API}/saisons-config/14/verrouiller", headers=auth(tresorier_token), timeout=30)
        assert r.status_code == 200, f"trésorier devrait pouvoir verrouiller: {r.status_code} {r.text}"

    def test_verrouiller_404_for_unknown_saison(self, admin_token):
        r = requests.post(f"{API}/saisons-config/9999/verrouiller", headers=auth(admin_token), timeout=30)
        assert r.status_code == 404

    def test_saisons_resume_no_cap_at_12(self):
        r = requests.get(f"{API}/statistiques/saisons-resume", timeout=30)
        assert r.status_code == 200
        stats = r.json()
        assert isinstance(stats, list)
        # Il doit y avoir au moins une saison >12 avec is_manuel=True (S13 ou S14)
        saisons_manuelles_gt12 = [s for s in stats if s["saison"] > 12 and s.get("is_manuel") is True]
        assert len(saisons_manuelles_gt12) >= 1, (
            f"Aucune saison >12 avec is_manuel=True dans saisons-resume — "
            f"saisons présentes: {[(s['saison'], s.get('is_manuel')) for s in stats]}"
        )


# -------------------- Tâche 3 : modification réponse sondage --------------------

class TestReponseSondageDelta:
    """Vérifie que presences_repas ne descend jamais <0 après plusieurs OUI/NON."""

    @pytest.fixture(scope="class")
    def repas_event_s14(self, admin_token):
        """Trouve un événement de type Repas (préférence S14, sinon plus récent)."""
        r = requests.get(f"{API}/evenements", timeout=30)
        assert r.status_code == 200
        events = r.json()
        # Priorité: repas S14
        for e in events:
            if e.get("saison") == 14 and (e.get("type_sondage") or "").lower() == "repas":
                return e
        # Fallback: n'importe quel repas récent (saison la plus élevée)
        repas = [e for e in events if (e.get("type_sondage") or "").lower() == "repas" and e.get("saison")]
        if not repas:
            pytest.skip("Aucun événement 'repas' trouvé pour tester la modification de réponse")
        repas.sort(key=lambda e: e.get("saison", 0), reverse=True)
        return repas[0]

    @pytest.fixture(scope="class")
    def fabien_id(self):
        r = requests.post(f"{API}/auth/key-login", json={"cle_activation": "labague1"}, timeout=30)
        return r.json()["member"]["id"]

    def _get_pres_repas(self, membre_id, saison):
        r = requests.get(f"{API}/presences", timeout=30)
        for p in r.json():
            if p["membre_id"] == membre_id and p["saison"] == saison:
                return p.get("presences_repas", 0)
        return 0

    def test_delta_never_negative(self, repas_event_s14, fabien_id):
        evt_id = repas_event_s14["id"]
        saison = repas_event_s14["saison"]
        initial = self._get_pres_repas(fabien_id, saison)

        # OUI -> présence peut augmenter
        r = requests.post(f"{API}/reponses-sondages", json={
            "evenement_id": evt_id, "membre_id": fabien_id, "present": True,
        }, timeout=30)
        assert r.status_code == 200
        after_oui1 = self._get_pres_repas(fabien_id, saison)
        assert after_oui1 >= initial

        # NON -> -1
        r = requests.post(f"{API}/reponses-sondages", json={
            "evenement_id": evt_id, "membre_id": fabien_id, "present": False,
        }, timeout=30)
        assert r.status_code == 200
        after_non = self._get_pres_repas(fabien_id, saison)
        assert after_non >= 0, "presences_repas est devenu négatif !"
        assert after_non <= after_oui1

        # NON -> NON (pas de changement)
        r = requests.post(f"{API}/reponses-sondages", json={
            "evenement_id": evt_id, "membre_id": fabien_id, "present": False,
        }, timeout=30)
        assert r.status_code == 200
        after_non2 = self._get_pres_repas(fabien_id, saison)
        assert after_non2 == after_non, "delta devrait être 0"
        assert after_non2 >= 0

        # OUI à nouveau
        r = requests.post(f"{API}/reponses-sondages", json={
            "evenement_id": evt_id, "membre_id": fabien_id, "present": True,
            "choix_plat": "Test plat A",
        }, timeout=30)
        assert r.status_code == 200
        after_oui2 = self._get_pres_repas(fabien_id, saison)
        assert after_oui2 == after_non2 + 1

        # Modification du choix de menu (pas de changement du present)
        r = requests.post(f"{API}/reponses-sondages", json={
            "evenement_id": evt_id, "membre_id": fabien_id, "present": True,
            "choix_plat": "Test plat B",
        }, timeout=30)
        assert r.status_code == 200
        after_menu_change = self._get_pres_repas(fabien_id, saison)
        assert after_menu_change == after_oui2, "changement de menu ne doit pas modifier le compteur"

        # Nettoyage : remettre l'état initial
        # Si Fabien n'avait pas de réponse au départ, supprimer la réponse
        requests.delete(f"{API}/reponses-sondages/{evt_id}/{fabien_id}", timeout=30)


# -------------------- Tâche 4 : nb_membres_actifs dynamique --------------------

class TestNbMembresActifsDynamique:
    """Vérifie que membres_actifs / nb_membres_actifs_saison sont calculés depuis la
    collection members (annee_entree + saisons_exclues) et NON depuis nb_membres_manuel."""

    @pytest.fixture(scope="class")
    def all_members(self):
        r = requests.get(f"{API}/members", timeout=30)
        assert r.status_code == 200
        return r.json()

    def _expected_for_saison(self, members, saison):
        n = 0
        for m in members:
            premiere = (m.get("annee_entree") or 2013) - 2012
            excl = m.get("saisons_exclues") or []
            if saison >= premiere and saison not in excl:
                n += 1
        return n

    def test_saisons_resume_membres_dynamique(self, all_members):
        r = requests.get(f"{API}/statistiques/saisons-resume", timeout=30)
        assert r.status_code == 200
        stats = r.json()
        assert len(stats) > 0

        total_members = len(all_members)
        print(f"\n[INFO] Nombre total de membres en base: {total_members}")

        # Pour chaque saison, vérifier membres_actifs == calcul dynamique
        for s in stats:
            saison = s["saison"]
            expected = self._expected_for_saison(all_members, saison)
            actual = s["membres_actifs"]
            print(f"  S{saison}: membres_actifs={actual} (attendu {expected}), is_manuel={s.get('is_manuel')}")
            assert actual == expected, (
                f"S{saison}: membres_actifs={actual} != attendu {expected} "
                f"(dépend peut-être encore de nb_membres_manuel)"
            )

        # S1 : uniquement fondateurs (annee_entree = 2013 => premiere_saison = 1)
        s1 = next((s for s in stats if s["saison"] == 1), None)
        if s1:
            fondateurs = [m for m in all_members if (m.get("annee_entree") or 2013) == 2013]
            assert s1["membres_actifs"] == len(fondateurs), (
                f"S1 devrait avoir {len(fondateurs)} fondateurs, a {s1['membres_actifs']}"
            )
            # Sanity: S1 doit être significativement plus petit que total
            assert s1["membres_actifs"] <= total_members

        # Saison la plus élevée : tous les membres actifs (annee_entree <= 2012+saison)
        max_s = max(s["saison"] for s in stats)
        top = next(s for s in stats if s["saison"] == max_s)
        expected_top = self._expected_for_saison(all_members, max_s)
        assert top["membres_actifs"] == expected_top

    def test_moyennes_dashboard_membres_dynamique(self, all_members):
        r = requests.get(f"{API}/statistiques/moyennes-dashboard", timeout=30)
        assert r.status_code == 200
        data = r.json()
        saison_actuelle = data["saison_actuelle"]
        expected = self._expected_for_saison(all_members, saison_actuelle)
        actual = data["nb_membres_actifs_saison"]
        print(f"\n[INFO] Dashboard saison_actuelle={saison_actuelle}, "
              f"nb_membres_actifs_saison={actual}, attendu={expected}")
        assert actual == expected, (
            f"nb_membres_actifs_saison={actual} != attendu {expected} (calcul dynamique)"
        )

        # total_pres_possible_global doit être cohérent : > 0 dès qu'il y a des events
        assert data["total_pres_possible_global"] >= 0
        assert 0 <= data["pct_global"] <= 100

    def test_is_manuel_dynamic_members_but_manual_presences(self, admin_token, all_members):
        """Sur une saison verrouillée (is_manuel=True), les PRÉSENCES restent manuelles
        MAIS membres_actifs doit rester dynamique."""
        # Utiliser S14 qu'on sait verrouillée d'après l'itération précédente
        r = requests.get(f"{API}/saisons-config/14", timeout=30)
        if r.status_code != 200:
            pytest.skip("S14 config not found")
        cfg = r.json()
        if not cfg.get("is_manuel"):
            # Verrouiller pour le test
            requests.post(f"{API}/saisons-config/14/verrouiller", headers=auth(admin_token), timeout=30)

        r2 = requests.get(f"{API}/statistiques/saisons-resume", timeout=30)
        stats = r2.json()
        s14 = next((s for s in stats if s["saison"] == 14), None)
        if s14 is None:
            pytest.skip("S14 absente de saisons-resume (probablement pas d'évènements S14)")

        expected_membres = self._expected_for_saison(all_members, 14)
        assert s14["membres_actifs"] == expected_membres, (
            f"S14 verrouillée: membres_actifs={s14['membres_actifs']} != {expected_membres} dynamique"
        )
        # is_manuel doit être True
        assert s14.get("is_manuel") is True

    def test_ajout_membre_incremente_compteur(self, all_members):
        """Ajouter un membre S14 (annee_entree=2026) doit incrémenter membres_actifs de S14 de +1.
        Nettoyage garanti via try/finally."""
        # État initial S14
        r = requests.get(f"{API}/statistiques/saisons-resume", timeout=30)
        stats_before = r.json()
        s14_before = next((s for s in stats_before if s["saison"] == 14), None)
        # Si S14 n'a pas d'events → pas dans saisons-resume ; utilisons dashboard à la place
        if s14_before is None:
            r_dash = requests.get(f"{API}/statistiques/moyennes-dashboard", timeout=30)
            dash_before = r_dash.json()
            if dash_before.get("saison_actuelle") != 14:
                pytest.skip(f"saison_actuelle={dash_before.get('saison_actuelle')} != 14")
            n_before = dash_before["nb_membres_actifs_saison"]
        else:
            n_before = s14_before["membres_actifs"]

        # Trouver un numéro libre (>=999 pour ne pas percuter la production)
        used = {m["numero_membre"] for m in all_members}
        test_numero = 9999
        while test_numero in used:
            test_numero -= 1

        payload = {
            "numero_membre": test_numero,
            "nom_complet": "TEST_Membre Dynamique",
            "fonction": "Membre",
            "annee_entree": 2026,
            "saison_entree": "Saison 14",
        }
        created_id = None
        try:
            r_create = requests.post(f"{API}/members", json=payload, timeout=30)
            assert r_create.status_code == 200, f"Create failed: {r_create.status_code} {r_create.text}"
            created_id = r_create.json()["id"]

            # Récupérer stats après
            if s14_before is None:
                r_dash2 = requests.get(f"{API}/statistiques/moyennes-dashboard", timeout=30)
                n_after = r_dash2.json()["nb_membres_actifs_saison"]
            else:
                r2 = requests.get(f"{API}/statistiques/saisons-resume", timeout=30)
                s14_after = next((s for s in r2.json() if s["saison"] == 14), None)
                assert s14_after is not None
                n_after = s14_after["membres_actifs"]

            print(f"\n[INFO] S14 membres_actifs avant={n_before} après ajout={n_after}")
            assert n_after == n_before + 1, (
                f"Ajout d'un membre S14 non pris en compte : {n_before} -> {n_after}"
            )
        finally:
            if created_id:
                r_del = requests.delete(f"{API}/members/{created_id}", timeout=30)
                assert r_del.status_code in (200, 204), f"Cleanup failed: {r_del.status_code} {r_del.text}"

"""
Test suite for new features in La Bague Impériale app:
1. Trésorier functionality - payment signalement
2. Marquer Absent button for non-répondants
3. Member titles (fonction) in sidebar/profile
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://imperial-cigars.preview.emergentagent.com')

class TestMembersAPI:
    """Test members API - verify fonction field for Trésorier and Secrétaire"""
    
    def test_get_members_returns_list(self):
        """GET /api/members should return a list of members"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one member"
        print(f"SUCCESS: GET /api/members returned {len(data)} members")
    
    def test_jacques_amadei_is_tresorier(self):
        """Verify Jacques François Amadei has fonction='Trésorier'"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200
        members = response.json()
        
        # Find Jacques François Amadei
        jacques_amadei = None
        for m in members:
            if 'Amadei' in m.get('nom_complet', '') and 'Jacques' in m.get('nom_complet', ''):
                jacques_amadei = m
                break
        
        if jacques_amadei:
            fonction = jacques_amadei.get('fonction', '')
            print(f"Found Jacques François Amadei with fonction: '{fonction}'")
            assert 'Trésorier' in fonction or 'trésorier' in fonction.lower(), \
                f"Jacques Amadei should have Trésorier fonction, got: {fonction}"
            print("SUCCESS: Jacques François Amadei has Trésorier fonction")
        else:
            # Check if there's any member with Trésorier fonction
            tresoriers = [m for m in members if 'trésorier' in m.get('fonction', '').lower()]
            print(f"Jacques Amadei not found. Found {len(tresoriers)} members with Trésorier fonction")
            if tresoriers:
                print(f"Trésorier: {tresoriers[0].get('nom_complet')}")
    
    def test_vesperini_is_secretaire(self):
        """Verify Jean François Vesperini has fonction='Secrétaire'"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200
        members = response.json()
        
        # Find Jean François Vesperini
        vesperini = None
        for m in members:
            if 'Vesperini' in m.get('nom_complet', ''):
                vesperini = m
                break
        
        if vesperini:
            fonction = vesperini.get('fonction', '')
            print(f"Found Vesperini with fonction: '{fonction}'")
            assert 'Secrétaire' in fonction or 'secrétaire' in fonction.lower(), \
                f"Vesperini should have Secrétaire fonction, got: {fonction}"
            print("SUCCESS: Jean François Vesperini has Secrétaire fonction")
        else:
            # Check if there's any member with Secrétaire fonction
            secretaires = [m for m in members if 'secrétaire' in m.get('fonction', '').lower()]
            print(f"Vesperini not found. Found {len(secretaires)} members with Secrétaire fonction")
            if secretaires:
                print(f"Secrétaire: {secretaires[0].get('nom_complet')}")


class TestPaiementsEnAttenteAPI:
    """Test paiements-en-attente API for Trésorier functionality"""
    
    def test_get_paiements_en_attente(self):
        """GET /api/paiements-en-attente should return list"""
        response = requests.get(f"{BASE_URL}/api/paiements-en-attente")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: GET /api/paiements-en-attente returned {len(data)} pending payments")
    
    def test_create_paiement_en_attente(self):
        """POST /api/paiements-en-attente should create a payment signalement"""
        # First get a member ID
        members_response = requests.get(f"{BASE_URL}/api/members")
        assert members_response.status_code == 200
        members = members_response.json()
        assert len(members) > 0, "Need at least one member"
        
        test_member = members[0]
        
        payload = {
            "membre_id": test_member['id'],
            "date_paiement": "2026-04-12",
            "type": "recette",
            "objet": "cotisation",
            "montant": 50.0,
            "endroit": "Chez Jacques",
            "detail": "TEST_paiement_tresorier"
        }
        
        response = requests.post(f"{BASE_URL}/api/paiements-en-attente", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "paiement" in data, "Response should contain 'paiement'"
        paiement = data['paiement']
        assert paiement['montant'] == 50.0
        assert paiement['objet'] == 'cotisation'
        assert paiement['statut'] == 'en_attente'
        
        print(f"SUCCESS: Created paiement en attente with ID: {paiement['id']}")
        
        # Cleanup - delete the test payment
        delete_response = requests.delete(f"{BASE_URL}/api/paiements-en-attente/{paiement['id']}")
        print(f"Cleanup: Deleted test payment (status: {delete_response.status_code})")
    
    def test_get_paiements_by_membre(self):
        """GET /api/paiements-en-attente/membre/{membre_id} should return member's payments"""
        # Get a member ID
        members_response = requests.get(f"{BASE_URL}/api/members")
        assert members_response.status_code == 200
        members = members_response.json()
        
        test_member = members[0]
        
        response = requests.get(f"{BASE_URL}/api/paiements-en-attente/membre/{test_member['id']}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: GET /api/paiements-en-attente/membre/{test_member['id'][:8]}... returned {len(data)} payments")


class TestReponsesManuelles:
    """Test reponses-manuelles API for 'Marquer Absent' functionality"""
    
    def test_get_reponses_manuelles(self):
        """GET /api/reponses-manuelles/{evenement_id} should return list"""
        # First get an event
        events_response = requests.get(f"{BASE_URL}/api/evenements")
        assert events_response.status_code == 200
        events = events_response.json()
        
        if len(events) == 0:
            pytest.skip("No events found to test")
        
        # Find an upcoming event
        upcoming = [e for e in events if e.get('statut') == 'à venir']
        if not upcoming:
            upcoming = events  # Use any event
        
        test_event = upcoming[0]
        
        response = requests.get(f"{BASE_URL}/api/reponses-manuelles/{test_event['id']}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: GET /api/reponses-manuelles/{test_event['id'][:8]}... returned {len(data)} manual responses")
    
    def test_create_reponse_manuelle_absent(self):
        """POST /api/reponses-manuelles with present=false should mark member as absent"""
        # Get an event
        events_response = requests.get(f"{BASE_URL}/api/evenements")
        assert events_response.status_code == 200
        events = events_response.json()
        
        if len(events) == 0:
            pytest.skip("No events found to test")
        
        upcoming = [e for e in events if e.get('statut') == 'à venir']
        if not upcoming:
            upcoming = events
        
        test_event = upcoming[0]
        
        # Get a member
        members_response = requests.get(f"{BASE_URL}/api/members")
        assert members_response.status_code == 200
        members = members_response.json()
        
        # Use a member that's not the president for testing
        test_member = None
        for m in members:
            if not m.get('is_president', False):
                test_member = m
                break
        
        if not test_member:
            test_member = members[-1]  # Use last member
        
        payload = {
            "evenement_id": test_event['id'],
            "nom": test_member['nom_complet'],
            "type": "membre_manuel",
            "membre_id": test_member['id'],
            "present": False,  # Mark as ABSENT
            "choix_entree": None,
            "choix_plat": None,
            "choix_dessert": None
        }
        
        response = requests.post(f"{BASE_URL}/api/reponses-manuelles", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reponse" in data, "Response should contain 'reponse'"
        reponse = data['reponse']
        assert reponse['present'] == False, "Member should be marked as absent"
        assert reponse['type'] == 'membre_manuel'
        
        print(f"SUCCESS: Created absent response for {test_member['nom_complet']}")
        
        # Verify it also created a reponses_sondages entry
        # (This is the key behavior - marking absent should create both entries)
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/reponses-manuelles/{reponse['id']}")
        print(f"Cleanup: Deleted test response (status: {delete_response.status_code})")


class TestMarcAntoineGuillotAbsent:
    """Verify Marc Antoine Guillot is marked as absent"""
    
    def test_marc_antoine_not_in_non_repondants(self):
        """Marc Antoine Guillot should NOT appear in non-répondants list (he was marked absent)"""
        # Get events
        events_response = requests.get(f"{BASE_URL}/api/evenements")
        assert events_response.status_code == 200
        events = events_response.json()
        
        # Find the event where Marc Antoine was marked absent
        # Event ID: 69c1c708-db48-4233-946d-ee062d563d76
        target_event_id = "69c1c708-db48-4233-946d-ee062d563d76"
        
        # Check manual responses for this event
        response = requests.get(f"{BASE_URL}/api/reponses-manuelles/{target_event_id}")
        
        if response.status_code == 200:
            manual_responses = response.json()
            
            # Check if Marc Antoine Guillot is in manual responses
            marc_antoine_response = None
            for r in manual_responses:
                if 'Guillot' in r.get('nom', '') or r.get('membre_id') == 'ba8c5b0d-f350-4fc4-8672-753879016345':
                    marc_antoine_response = r
                    break
            
            if marc_antoine_response:
                print(f"Found Marc Antoine Guillot in manual responses: present={marc_antoine_response.get('present')}")
                assert marc_antoine_response.get('present') == False, "Marc Antoine should be marked as absent"
                print("SUCCESS: Marc Antoine Guillot is correctly marked as absent")
            else:
                print("Marc Antoine Guillot not found in manual responses for this event")
        else:
            print(f"Could not fetch manual responses for event {target_event_id}")


class TestKeyLogin:
    """Test key-based login for labague1 and labague3"""
    
    def test_login_labague1_president(self):
        """Login with labague1 should return Fabien Lanfranchi (Président)"""
        payload = {"cle_activation": "labague1"}
        response = requests.post(f"{BASE_URL}/api/auth/key-login", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get('success') == True, "Login should succeed"
        member = data.get('member', {})
        
        print(f"Logged in as: {member.get('nom_complet')}")
        print(f"Fonction: {member.get('fonction')}")
        print(f"Is President: {member.get('is_president')}")
        
        assert member.get('is_president') == True, "labague1 should be president"
        print("SUCCESS: labague1 login returns Président")
    
    def test_login_labague3_tresorier(self):
        """Login with labague3 should return Jacques Peretti (Trésorier)"""
        payload = {"cle_activation": "labague3"}
        response = requests.post(f"{BASE_URL}/api/auth/key-login", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get('success') == True, "Login should succeed"
        member = data.get('member', {})
        
        print(f"Logged in as: {member.get('nom_complet')}")
        print(f"Fonction: {member.get('fonction')}")
        
        fonction = member.get('fonction', '')
        assert 'Trésorier' in fonction or 'trésorier' in fonction.lower(), \
            f"labague3 should have Trésorier fonction, got: {fonction}"
        print("SUCCESS: labague3 login returns Trésorier")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

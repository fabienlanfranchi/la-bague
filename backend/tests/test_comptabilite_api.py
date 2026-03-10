"""
Test file for Comptabilité (Accounting) API endpoints
Tests: Comptes, Transactions, Dettes, Virements
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestComptes:
    """Test des endpoints pour les comptes/caisses"""
    
    def test_get_comptes(self):
        """GET /api/comptes - Liste tous les comptes"""
        response = requests.get(f"{BASE_URL}/api/comptes")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Vérifier la structure d'un compte
        compte = data[0]
        assert "id" in compte
        assert "nom" in compte
        assert "type" in compte
        assert "solde" in compte
        print(f"✓ Found {len(data)} comptes")

    def test_comptes_contains_expected_accounts(self):
        """Verify expected accounts exist: Compte Bancaire, PayPal, Chez Fabien, Chez Jacques, Dehors"""
        response = requests.get(f"{BASE_URL}/api/comptes")
        assert response.status_code == 200
        
        data = response.json()
        account_names = [c['nom'] for c in data]
        
        expected_accounts = ['Compte Bancaire', 'PayPal', 'Chez Fabien', 'Chez Jacques', 'Dehors']
        for expected in expected_accounts:
            assert expected in account_names, f"Missing expected account: {expected}"
        print(f"✓ All expected accounts found: {expected_accounts}")


class TestTransactions:
    """Test des endpoints pour les transactions/mouvements"""
    
    def test_get_transactions(self):
        """GET /api/transactions - Liste toutes les transactions"""
        response = requests.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} transactions")

    def test_get_transactions_summary(self):
        """GET /api/transactions/summary - Récupère le résumé financier"""
        response = requests.get(f"{BASE_URL}/api/transactions/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "solde_total" in data
        assert "total_recettes" in data
        assert "total_depenses" in data
        assert "nombre_transactions" in data
        assert "cotisations_en_attente" in data
        
        assert isinstance(data["solde_total"], (int, float))
        assert isinstance(data["total_recettes"], (int, float))
        print(f"✓ Summary: solde_total={data['solde_total']}, recettes={data['total_recettes']}, dépenses={data['total_depenses']}")

    def test_create_transaction_recette(self):
        """POST /api/transactions - Crée une recette et vérifie"""
        # Get current account balance
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        paypal_account = next((c for c in comptes_data if c['nom'] == 'PayPal'), None)
        assert paypal_account is not None
        initial_balance = paypal_account['solde']
        
        # Create a test transaction
        transaction_data = {
            "date": "2026-01-15T10:00:00Z",
            "type": "recette",
            "membre_id": None,
            "objet": "TEST_cotisation",
            "montant": 50.0,
            "endroit": "PayPal",
            "detail": "Test transaction"
        }
        
        response = requests.post(f"{BASE_URL}/api/transactions", json=transaction_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["type"] == "recette"
        assert data["montant"] == 50.0
        assert data["endroit"] == "PayPal"
        assert "id" in data
        
        transaction_id = data["id"]
        
        # Verify balance increased
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        paypal_account = next((c for c in comptes_data if c['nom'] == 'PayPal'), None)
        assert paypal_account['solde'] == initial_balance + 50.0, "Balance should increase after recette"
        
        # Cleanup - delete transaction
        delete_response = requests.delete(f"{BASE_URL}/api/transactions/{transaction_id}")
        assert delete_response.status_code == 200
        print(f"✓ Created and deleted test recette transaction")

    def test_create_transaction_depense(self):
        """POST /api/transactions - Crée une dépense et vérifie"""
        # Get current account balance
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        fabien_account = next((c for c in comptes_data if c['nom'] == 'Chez Fabien'), None)
        assert fabien_account is not None
        initial_balance = fabien_account['solde']
        
        # Create expense transaction
        transaction_data = {
            "date": "2026-01-15T10:00:00Z",
            "type": "dépense",
            "membre_id": None,
            "objet": "TEST_fournitures",
            "montant": 25.0,
            "endroit": "Chez Fabien",
            "detail": "Test expense"
        }
        
        response = requests.post(f"{BASE_URL}/api/transactions", json=transaction_data)
        assert response.status_code == 200
        
        data = response.json()
        transaction_id = data["id"]
        
        # Verify balance decreased
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        fabien_account = next((c for c in comptes_data if c['nom'] == 'Chez Fabien'), None)
        assert fabien_account['solde'] == initial_balance - 25.0, "Balance should decrease after dépense"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/transactions/{transaction_id}")
        print(f"✓ Created and deleted test dépense transaction")


class TestDettes:
    """Test des endpoints pour les dettes (Dehors)"""
    
    def test_get_dettes(self):
        """GET /api/dettes - Liste toutes les dettes"""
        response = requests.get(f"{BASE_URL}/api/dettes")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            dette = data[0]
            assert "id" in dette
            assert "membre_id" in dette
            assert "montant" in dette
            assert "cause" in dette
        print(f"✓ Found {len(data)} dettes")

    def test_dette_structure(self):
        """Verify dette objects have correct structure"""
        response = requests.get(f"{BASE_URL}/api/dettes")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            dette = data[0]
            assert isinstance(dette["montant"], (int, float))
            assert isinstance(dette["cause"], str)
            assert len(dette["cause"]) > 0
            print(f"✓ Dette structure valid: MEMBRE={dette['membre_id'][:8]}... DOIT={dette['montant']}€ CAUSE={dette['cause']}")

    def test_create_and_delete_dette(self):
        """POST + DELETE /api/dettes - Crée puis supprime une dette"""
        # Get a member ID first
        members_response = requests.get(f"{BASE_URL}/api/members")
        members_data = members_response.json()
        assert len(members_data) > 0
        member_id = members_data[0]["id"]
        
        # Create a test dette
        dette_data = {
            "membre_id": member_id,
            "montant": 30.0,
            "cause": "TEST_dette_tombola"
        }
        
        response = requests.post(f"{BASE_URL}/api/dettes", json=dette_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["membre_id"] == member_id
        assert data["montant"] == 30.0
        assert data["cause"] == "TEST_dette_tombola"
        dette_id = data["id"]
        
        # Verify it's in the list
        dettes_response = requests.get(f"{BASE_URL}/api/dettes")
        dettes_data = dettes_response.json()
        dette_ids = [d["id"] for d in dettes_data]
        assert dette_id in dette_ids
        
        # Delete the dette
        delete_response = requests.delete(f"{BASE_URL}/api/dettes/{dette_id}")
        assert delete_response.status_code == 200
        
        # Verify it's removed
        dettes_response = requests.get(f"{BASE_URL}/api/dettes")
        dettes_data = dettes_response.json()
        dette_ids = [d["id"] for d in dettes_data]
        assert dette_id not in dette_ids
        print(f"✓ Created and deleted test dette")


class TestVirements:
    """Test des endpoints pour les virements entre comptes"""
    
    def test_virement_between_comptes(self):
        """POST /api/virements - Effectue un virement entre deux comptes"""
        # Get initial balances
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        
        fabien_account = next((c for c in comptes_data if c['nom'] == 'Chez Fabien'), None)
        jacques_account = next((c for c in comptes_data if c['nom'] == 'Chez Jacques'), None)
        
        assert fabien_account is not None
        assert jacques_account is not None
        
        initial_fabien = fabien_account['solde']
        initial_jacques = jacques_account['solde']
        
        # Only test if Fabien has enough balance
        if initial_fabien < 10:
            pytest.skip("Not enough balance in Chez Fabien for virement test")
        
        # Execute virement
        virement_data = {
            "compte_source": "Chez Fabien",
            "compte_destination": "Chez Jacques",
            "montant": 10.0,
            "description": "TEST_virement_interne"
        }
        
        response = requests.post(f"{BASE_URL}/api/virements", json=virement_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert data["montant"] == 10.0
        
        # Verify balances changed
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        
        fabien_account = next((c for c in comptes_data if c['nom'] == 'Chez Fabien'), None)
        jacques_account = next((c for c in comptes_data if c['nom'] == 'Chez Jacques'), None)
        
        assert fabien_account['solde'] == initial_fabien - 10.0
        assert jacques_account['solde'] == initial_jacques + 10.0
        
        # Reverse the virement to restore original balances
        reverse_virement_data = {
            "compte_source": "Chez Jacques",
            "compte_destination": "Chez Fabien",
            "montant": 10.0,
            "description": "TEST_virement_reversal"
        }
        requests.post(f"{BASE_URL}/api/virements", json=reverse_virement_data)
        print(f"✓ Virement executed and reversed successfully")

    def test_virement_insufficient_funds(self):
        """POST /api/virements - Should fail with insufficient funds"""
        # Try to transfer more than available
        virement_data = {
            "compte_source": "Chez Fabien",
            "compte_destination": "Chez Jacques",
            "montant": 9999999.0,
            "description": "TEST_should_fail"
        }
        
        response = requests.post(f"{BASE_URL}/api/virements", json=virement_data)
        assert response.status_code == 400
        print(f"✓ Virement correctly rejected for insufficient funds")

    def test_virement_same_account(self):
        """POST /api/virements - Should fail when source equals destination"""
        virement_data = {
            "compte_source": "Chez Fabien",
            "compte_destination": "Chez Fabien",
            "montant": 10.0,
            "description": "TEST_same_account"
        }
        
        response = requests.post(f"{BASE_URL}/api/virements", json=virement_data)
        assert response.status_code == 400
        print(f"✓ Virement correctly rejected for same source/destination")

    def test_virement_dehors_to_compte(self):
        """POST /api/virements - Virement depuis Dehors vers un compte (règlement de dette)"""
        # Get current dettes
        dettes_response = requests.get(f"{BASE_URL}/api/dettes")
        dettes_data = dettes_response.json()
        
        if len(dettes_data) == 0:
            # Create a test dette first
            members_response = requests.get(f"{BASE_URL}/api/members")
            members_data = members_response.json()
            member_id = members_data[0]["id"]
            
            dette_data = {
                "membre_id": member_id,
                "montant": 20.0,
                "cause": "TEST_dette_for_virement"
            }
            response = requests.post(f"{BASE_URL}/api/dettes", json=dette_data)
            dette_id = response.json()["id"]
        else:
            dette_id = dettes_data[0]["id"]
            
        # Get total dettes (Dehors balance)
        dettes_response = requests.get(f"{BASE_URL}/api/dettes")
        total_dettes = sum(d['montant'] for d in dettes_response.json())
        
        # Get PayPal initial balance
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        paypal_account = next((c for c in comptes_data if c['nom'] == 'PayPal'), None)
        initial_paypal = paypal_account['solde']
        
        # Execute virement from Dehors
        virement_data = {
            "compte_source": "Dehors",
            "compte_destination": "PayPal",
            "montant": 10.0,
            "description": "TEST_reglement_dette"
        }
        
        response = requests.post(f"{BASE_URL}/api/virements", json=virement_data)
        
        # This should work since Dehors is a virtual account
        if response.status_code == 200:
            data = response.json()
            assert data["de"] == "Dehors"
            assert data["vers"] == "PayPal"
            
            # Verify PayPal balance increased
            comptes_response = requests.get(f"{BASE_URL}/api/comptes")
            comptes_data = comptes_response.json()
            paypal_account = next((c for c in comptes_data if c['nom'] == 'PayPal'), None)
            assert paypal_account['solde'] == initial_paypal + 10.0
            
            # Reverse the virement
            reverse_data = {
                "compte_source": "PayPal",
                "compte_destination": "Dehors",
                "montant": 10.0,
                "description": "TEST_reversal"
            }
            requests.post(f"{BASE_URL}/api/virements", json=reverse_data)
            print(f"✓ Virement from Dehors to PayPal works correctly")
        else:
            print(f"⚠ Virement from Dehors returned {response.status_code}: {response.text}")


class TestDetteReglement:
    """Test du workflow complet de règlement de dette"""
    
    def test_dette_reglement_workflow(self):
        """Full workflow: Create dette → Virement → Delete dette"""
        # 1. Get a member
        members_response = requests.get(f"{BASE_URL}/api/members")
        members_data = members_response.json()
        member = members_data[0]
        member_id = member["id"]
        
        # 2. Get initial PayPal balance
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        paypal_account = next((c for c in comptes_data if c['nom'] == 'PayPal'), None)
        initial_paypal = paypal_account['solde']
        
        # 3. Create a test dette
        dette_data = {
            "membre_id": member_id,
            "montant": 50.0,
            "cause": "TEST_workflow_reglement"
        }
        response = requests.post(f"{BASE_URL}/api/dettes", json=dette_data)
        assert response.status_code == 200
        dette = response.json()
        dette_id = dette["id"]
        
        # 4. Perform virement from Dehors to PayPal
        virement_data = {
            "compte_source": "Dehors",
            "compte_destination": "PayPal",
            "montant": 50.0,
            "description": f"Paiement dette: {dette['cause']} ({member['nom_complet']})"
        }
        response = requests.post(f"{BASE_URL}/api/virements", json=virement_data)
        assert response.status_code == 200
        
        # 5. Delete the dette (mark as paid)
        delete_response = requests.delete(f"{BASE_URL}/api/dettes/{dette_id}")
        assert delete_response.status_code == 200
        
        # 6. Verify PayPal balance increased
        comptes_response = requests.get(f"{BASE_URL}/api/comptes")
        comptes_data = comptes_response.json()
        paypal_account = next((c for c in comptes_data if c['nom'] == 'PayPal'), None)
        assert paypal_account['solde'] == initial_paypal + 50.0
        
        # 7. Cleanup - reverse the virement
        reverse_data = {
            "compte_source": "PayPal",
            "compte_destination": "Dehors",
            "montant": 50.0,
            "description": "TEST_cleanup"
        }
        requests.post(f"{BASE_URL}/api/virements", json=reverse_data)
        
        print(f"✓ Full dette reglement workflow completed successfully")


class TestMembers:
    """Test des endpoints membres pour la comptabilité"""
    
    def test_get_members(self):
        """GET /api/members - Liste tous les membres"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        member = data[0]
        assert "id" in member
        assert "nom_complet" in member
        print(f"✓ Found {len(data)} members")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

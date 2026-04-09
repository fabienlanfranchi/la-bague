"""
Tests for Prochain Événement Info API
Feature: Info - Prochain événement template in Messages
Tests: POST, GET, DELETE /api/prochain-evenement-info
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProchainEvenementInfoAPI:
    """Tests for the Prochain Événement Info feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.api_url = f"{BASE_URL}/api"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Test data
        self.test_info_id = None
        yield
        # Cleanup: Delete test info if created
        if self.test_info_id:
            try:
                self.session.delete(f"{self.api_url}/prochain-evenement-info/{self.test_info_id}")
            except:
                pass
    
    def test_01_get_prochain_evenement_info_existing(self):
        """Test GET /api/prochain-evenement-info - should return existing active info"""
        response = self.session.get(f"{self.api_url}/prochain-evenement-info")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "info" in data, "Response should contain 'info' key"
        
        # There's existing test data (repas on 2026-05-20)
        if data["info"]:
            info = data["info"]
            assert "id" in info, "Info should have an id"
            assert "type_evenement" in info, "Info should have type_evenement"
            assert "date" in info, "Info should have date"
            assert "lieu" in info, "Info should have lieu"
            assert "actif" in info, "Info should have actif status"
            assert info["actif"] == True, "Info should be active"
            print(f"✓ Found existing info: {info['type_evenement']} on {info['date']} at {info['lieu']}")
    
    def test_02_create_prochain_evenement_info_apero(self):
        """Test POST /api/prochain-evenement-info - create apéro info"""
        # Create a future date
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "type_evenement": "apero",
            "date": future_date,
            "lieu": "TEST - Bar Le Cigare, Ajaccio"
        }
        
        response = self.session.post(
            f"{self.api_url}/prochain-evenement-info",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "info" in data, "Response should contain info"
        assert "id" in data, "Response should contain id"
        
        info = data["info"]
        assert info["type_evenement"] == "apero", f"Expected 'apero', got {info['type_evenement']}"
        assert info["date"] == future_date, f"Expected {future_date}, got {info['date']}"
        assert info["lieu"] == "TEST - Bar Le Cigare, Ajaccio"
        assert info["actif"] == True, "New info should be active"
        
        self.test_info_id = data["id"]
        print(f"✓ Created apéro info with id: {self.test_info_id}")
    
    def test_03_create_prochain_evenement_info_repas(self):
        """Test POST /api/prochain-evenement-info - create repas info"""
        future_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        payload = {
            "type_evenement": "repas",
            "date": future_date,
            "lieu": "TEST - Restaurant Le Miramar, Ajaccio"
        }
        
        response = self.session.post(
            f"{self.api_url}/prochain-evenement-info",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        info = data["info"]
        assert info["type_evenement"] == "repas"
        assert info["date"] == future_date
        assert info["actif"] == True
        
        self.test_info_id = data["id"]
        print(f"✓ Created repas info with id: {self.test_info_id}")
    
    def test_04_verify_new_info_replaces_old(self):
        """Test that creating new info deactivates old ones"""
        # Create first info
        date1 = (datetime.now() + timedelta(days=50)).strftime("%Y-%m-%d")
        response1 = self.session.post(
            f"{self.api_url}/prochain-evenement-info",
            json={"type_evenement": "apero", "date": date1, "lieu": "TEST - Lieu 1"}
        )
        assert response1.status_code == 200
        id1 = response1.json()["id"]
        
        # Create second info
        date2 = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        response2 = self.session.post(
            f"{self.api_url}/prochain-evenement-info",
            json={"type_evenement": "repas", "date": date2, "lieu": "TEST - Lieu 2"}
        )
        assert response2.status_code == 200
        id2 = response2.json()["id"]
        
        # Get current active info - should be the second one
        response_get = self.session.get(f"{self.api_url}/prochain-evenement-info")
        assert response_get.status_code == 200
        
        current_info = response_get.json()["info"]
        assert current_info is not None, "Should have an active info"
        assert current_info["id"] == id2, "Active info should be the most recent one"
        assert current_info["lieu"] == "TEST - Lieu 2"
        
        # Cleanup
        self.session.delete(f"{self.api_url}/prochain-evenement-info/{id1}")
        self.session.delete(f"{self.api_url}/prochain-evenement-info/{id2}")
        
        print("✓ New info correctly replaces old info")
    
    def test_05_delete_prochain_evenement_info(self):
        """Test DELETE /api/prochain-evenement-info/{id} - deactivate info"""
        # First create an info to delete
        future_date = (datetime.now() + timedelta(days=70)).strftime("%Y-%m-%d")
        create_response = self.session.post(
            f"{self.api_url}/prochain-evenement-info",
            json={"type_evenement": "apero", "date": future_date, "lieu": "TEST - To Delete"}
        )
        assert create_response.status_code == 200
        info_id = create_response.json()["id"]
        
        # Delete (deactivate) the info
        delete_response = self.session.delete(f"{self.api_url}/prochain-evenement-info/{info_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        data = delete_response.json()
        assert data.get("success") == True
        assert "désactivée" in data.get("message", "").lower() or "message" in data
        
        print(f"✓ Successfully deactivated info {info_id}")
    
    def test_06_delete_nonexistent_info(self):
        """Test DELETE /api/prochain-evenement-info/{id} - non-existent id"""
        fake_id = "nonexistent-id-12345"
        
        response = self.session.delete(f"{self.api_url}/prochain-evenement-info/{fake_id}")
        
        # Should return 404 for non-existent info
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for non-existent info")
    
    def test_07_create_info_validation(self):
        """Test POST /api/prochain-evenement-info - validation"""
        # Test with missing fields
        invalid_payloads = [
            {"type_evenement": "apero"},  # Missing date and lieu
            {"date": "2026-06-01"},  # Missing type_evenement and lieu
            {"lieu": "Test"},  # Missing type_evenement and date
        ]
        
        for payload in invalid_payloads:
            response = self.session.post(
                f"{self.api_url}/prochain-evenement-info",
                json=payload
            )
            # Should return 422 for validation error
            assert response.status_code == 422, f"Expected 422 for payload {payload}, got {response.status_code}"
        
        print("✓ Validation correctly rejects incomplete payloads")


class TestMessagesAPI:
    """Tests for Messages API related to prochain événement info"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.api_url = f"{BASE_URL}/api"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_01_send_message_with_info_type(self):
        """Test POST /api/messages - send info_prochain_evenement message"""
        # Get members to send to
        members_response = self.session.get(f"{self.api_url}/members")
        assert members_response.status_code == 200
        members = members_response.json()
        
        # Take first 3 members for test
        destinataires = [m["id"] for m in members[:3]]
        
        payload = {
            "type": "info_prochain_evenement",
            "titre": "Prochain apéro",
            "contenu": "📅 Samedi 15 février 2026\n📍 Bar Le Cigare, Ajaccio\n\nPlus d'informations à venir sur l'application.",
            "destinataires": destinataires
        }
        
        response = self.session.post(f"{self.api_url}/messages", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "message" in data, "Response should contain message id or confirmation"
        
        print(f"✓ Successfully sent info_prochain_evenement message to {len(destinataires)} members")
    
    def test_02_get_messages(self):
        """Test GET /api/messages - verify messages list"""
        response = self.session.get(f"{self.api_url}/messages")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        messages = response.json()
        assert isinstance(messages, list), "Response should be a list"
        
        # Check if there are any info_prochain_evenement messages
        info_messages = [m for m in messages if m.get("type") == "info_prochain_evenement"]
        print(f"✓ Found {len(info_messages)} info_prochain_evenement messages out of {len(messages)} total")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

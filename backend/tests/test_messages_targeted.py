"""
Test suite for targeted messaging feature in La Bague Impériale
Tests the ability to send messages to specific members vs all members
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTargetedMessaging:
    """Tests for POST /api/messages with targeted recipients"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - get member IDs"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Get all members to use for testing
        response = self.session.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200, f"Failed to get members: {response.text}"
        self.members = response.json()
        assert len(self.members) > 0, "No members found in database"
        print(f"Found {len(self.members)} members for testing")
        
    def test_send_message_to_all_members_empty_destinataires(self):
        """
        Test: POST /api/messages with destinataires=[] (empty array)
        Expected: All members should receive a notification
        """
        # Count members before sending
        total_members = len(self.members)
        print(f"Total members: {total_members}")
        
        # Send message with empty destinataires (should go to all)
        payload = {
            "type": "message_libre",
            "titre": "TEST - Message à tous",
            "contenu": "Ce message devrait être envoyé à tous les membres",
            "destinataires": []  # Empty = all members
        }
        
        response = self.session.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        
        data = response.json()
        print(f"Response: {data}")
        
        # Verify notifications were created for all members
        assert "notifications_envoyees" in data, "Response should contain notifications_envoyees"
        assert data["notifications_envoyees"] == total_members, \
            f"Expected {total_members} notifications, got {data['notifications_envoyees']}"
        
        # Cleanup - delete the test message
        if "id" in data:
            self.session.delete(f"{BASE_URL}/api/messages/{data['id']}")
            print(f"Cleaned up test message {data['id']}")
    
    def test_send_message_to_specific_members(self):
        """
        Test: POST /api/messages with specific member IDs
        Expected: Only specified members should receive notifications
        """
        # Select 2 specific members
        if len(self.members) < 2:
            pytest.skip("Need at least 2 members for this test")
        
        target_members = [self.members[0]["id"], self.members[1]["id"]]
        print(f"Targeting members: {target_members}")
        
        # Send message to specific members
        payload = {
            "type": "message_libre",
            "titre": "TEST - Message ciblé",
            "contenu": "Ce message devrait être envoyé uniquement aux membres ciblés",
            "destinataires": target_members
        }
        
        response = self.session.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        
        data = response.json()
        print(f"Response: {data}")
        
        # Verify only 2 notifications were created
        assert "notifications_envoyees" in data, "Response should contain notifications_envoyees"
        assert data["notifications_envoyees"] == 2, \
            f"Expected 2 notifications, got {data['notifications_envoyees']}"
        
        # Cleanup
        if "id" in data:
            self.session.delete(f"{BASE_URL}/api/messages/{data['id']}")
            print(f"Cleaned up test message {data['id']}")
    
    def test_send_message_to_single_member(self):
        """
        Test: POST /api/messages with single member ID
        Expected: Only 1 notification should be created
        """
        target_member = [self.members[0]["id"]]
        print(f"Targeting single member: {target_member}")
        
        payload = {
            "type": "rappel_cotisation",
            "titre": "TEST - Rappel individuel",
            "contenu": "Ce message est pour un seul membre",
            "destinataires": target_member
        }
        
        response = self.session.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        
        data = response.json()
        print(f"Response: {data}")
        
        # Verify only 1 notification was created
        assert data["notifications_envoyees"] == 1, \
            f"Expected 1 notification, got {data['notifications_envoyees']}"
        
        # Cleanup
        if "id" in data:
            self.session.delete(f"{BASE_URL}/api/messages/{data['id']}")
    
    def test_message_stored_with_destinataires(self):
        """
        Test: Verify message is stored with correct destinataires list
        """
        target_members = [self.members[0]["id"]]
        
        payload = {
            "type": "message_libre",
            "titre": "TEST - Vérification stockage",
            "contenu": "Test de stockage des destinataires",
            "destinataires": target_members
        }
        
        # Create message
        response = self.session.post(f"{BASE_URL}/api/messages", json=payload)
        assert response.status_code == 200
        message_id = response.json()["id"]
        
        # Retrieve message and verify destinataires
        get_response = self.session.get(f"{BASE_URL}/api/messages/{message_id}")
        assert get_response.status_code == 200, f"Failed to get message: {get_response.text}"
        
        message = get_response.json()
        print(f"Stored message: {message}")
        
        assert "destinataires" in message, "Message should have destinataires field"
        assert message["destinataires"] == target_members, \
            f"Expected destinataires {target_members}, got {message['destinataires']}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/messages/{message_id}")
    
    def test_message_types(self):
        """
        Test: Verify different message types work with targeted recipients
        """
        message_types = [
            "rappel_cotisation",
            "rappel_sondage", 
            "nouvel_evenement",
            "nouveau_membre",
            "sortie_club",
            "message_libre"
        ]
        
        target_member = [self.members[0]["id"]]
        
        for msg_type in message_types:
            payload = {
                "type": msg_type,
                "titre": f"TEST - Type {msg_type}",
                "contenu": f"Test du type {msg_type}",
                "destinataires": target_member
            }
            
            response = self.session.post(f"{BASE_URL}/api/messages", json=payload)
            assert response.status_code == 200, f"Failed for type {msg_type}: {response.text}"
            
            data = response.json()
            assert data["notifications_envoyees"] == 1, f"Type {msg_type} should send 1 notification"
            print(f"Type {msg_type}: OK")
            
            # Cleanup
            if "id" in data:
                self.session.delete(f"{BASE_URL}/api/messages/{data['id']}")


class TestMembersEndpoint:
    """Tests for GET /api/members - needed for frontend dropdown"""
    
    def test_get_all_members(self):
        """Verify members endpoint returns list with required fields"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200
        
        members = response.json()
        assert isinstance(members, list), "Should return a list"
        assert len(members) > 0, "Should have at least one member"
        
        # Check required fields for frontend dropdown
        first_member = members[0]
        assert "id" in first_member, "Member should have id"
        assert "nom_complet" in first_member, "Member should have nom_complet"
        
        print(f"Found {len(members)} members with required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

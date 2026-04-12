"""
Test Profile Settings Features for La Bague Impériale
- Change password API endpoint
- Profile page settings section
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cigar-management-app.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "fabien.lanfranchi@yahoo.fr"
TEST_PASSWORD = "fabienlabague1"


class TestAuthChangePassword:
    """Test /api/auth/change-password endpoint"""
    
    @pytest.fixture
    def member_id(self):
        """Get member ID by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["member"]["id"]
    
    def test_change_password_missing_fields(self, member_id):
        """Test change password with missing fields returns error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "membre_id": member_id,
                "ancien_mot_de_passe": "",
                "nouveau_mot_de_passe": "",
                "confirmer_mot_de_passe": ""
            }
        )
        # Should fail validation or return error
        assert response.status_code in [400, 401, 422], f"Expected error status, got {response.status_code}"
    
    def test_change_password_wrong_current_password(self, member_id):
        """Test change password with wrong current password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "membre_id": member_id,
                "ancien_mot_de_passe": "wrongpassword123",
                "nouveau_mot_de_passe": "newpassword123",
                "confirmer_mot_de_passe": "newpassword123"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "incorrect" in data.get("detail", "").lower() or "mot de passe" in data.get("detail", "").lower()
    
    def test_change_password_mismatch_confirmation(self, member_id):
        """Test change password with mismatched confirmation"""
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "membre_id": member_id,
                "ancien_mot_de_passe": TEST_PASSWORD,
                "nouveau_mot_de_passe": "newpassword123",
                "confirmer_mot_de_passe": "differentpassword123"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "correspondent" in data.get("detail", "").lower() or "match" in data.get("detail", "").lower()
    
    def test_change_password_success_and_revert(self, member_id):
        """Test successful password change and revert back"""
        new_password = "newpassword123"
        
        # Step 1: Change password
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "membre_id": member_id,
                "ancien_mot_de_passe": TEST_PASSWORD,
                "nouveau_mot_de_passe": new_password,
                "confirmer_mot_de_passe": new_password
            }
        )
        assert response.status_code == 200, f"Password change failed: {response.text}"
        data = response.json()
        assert "succès" in data.get("message", "").lower() or "success" in data.get("message", "").lower()
        
        # Step 2: Verify login with new password works
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": new_password}
        )
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.text}"
        
        # Step 3: Revert password back to original
        revert_response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "membre_id": member_id,
                "ancien_mot_de_passe": new_password,
                "nouveau_mot_de_passe": TEST_PASSWORD,
                "confirmer_mot_de_passe": TEST_PASSWORD
            }
        )
        assert revert_response.status_code == 200, f"Password revert failed: {revert_response.text}"
        
        # Step 4: Verify login with original password works
        final_login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert final_login.status_code == 200, f"Login with original password failed: {final_login.text}"
    
    def test_change_password_invalid_member_id(self):
        """Test change password with invalid member ID"""
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "membre_id": "invalid-member-id-12345",
                "ancien_mot_de_passe": TEST_PASSWORD,
                "nouveau_mot_de_passe": "newpassword123",
                "confirmer_mot_de_passe": "newpassword123"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestAuthLogout:
    """Test /api/auth/logout endpoint"""
    
    def test_logout_endpoint(self):
        """Test logout endpoint returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200, f"Logout failed: {response.text}"
        data = response.json()
        assert "message" in data


class TestMemberProfile:
    """Test member profile data for settings section"""
    
    def test_login_returns_member_data(self):
        """Test login returns member data with email and name"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify member data structure
        member = data.get("member", {})
        assert "email" in member, "Member should have email field"
        assert "nom_complet" in member, "Member should have nom_complet field"
        assert "id" in member, "Member should have id field"
        
        # Verify values
        assert member["email"] == TEST_EMAIL
        assert "Fabien" in member["nom_complet"]


class TestMembersEndpoint:
    """Test /api/members endpoint for profile data"""
    
    def test_get_members(self):
        """Test GET /api/members returns list with required fields"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        assert len(data) > 0, "Should have at least one member"
        
        # Check first member has required fields
        member = data[0]
        required_fields = ["id", "nom_complet", "email", "numero_membre"]
        for field in required_fields:
            assert field in member, f"Member should have {field} field"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test suite for Favoris (Favorites) feature in La Bague Impériale
Tests:
- POST /api/favoris/toggle-from-catalogue - Toggle favori from catalogue
- POST /api/ma-cigarotheque/{cigare_id}/favori - Toggle favori in Ma Cigarthèque
- GET /api/ma-cigarotheque/{membre_id}/favoris - Get member's favorites
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "fabien.lanfranchi@yahoo.fr"
TEST_PASSWORD = "fabienlabague1"


class TestFavorisAPI:
    """Test suite for Favoris API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and get member info"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get member info
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.member = data.get("member", {})
            self.member_id = self.member.get("id")
            print(f"Logged in as: {self.member.get('nom_complet')} (ID: {self.member_id})")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_catalogue_cigares(self):
        """Test that we can get cigares from catalogue"""
        response = self.session.get(f"{BASE_URL}/api/cigares?limit=5")
        assert response.status_code == 200, f"Failed to get cigares: {response.text}"
        
        data = response.json()
        assert "cigares" in data, "Response should contain 'cigares' key"
        assert len(data["cigares"]) > 0, "Should have at least one cigare"
        
        # Store first cigare for later tests
        self.test_cigare = data["cigares"][0]
        print(f"Found cigare: {self.test_cigare.get('marque')} (ID: {self.test_cigare.get('id')})")
        return self.test_cigare
    
    def test_toggle_favori_from_catalogue_add(self):
        """Test adding a cigare to favorites from catalogue"""
        # First get a cigare from catalogue
        cigares_response = self.session.get(f"{BASE_URL}/api/cigares?limit=5")
        assert cigares_response.status_code == 200
        cigares = cigares_response.json().get("cigares", [])
        assert len(cigares) > 0, "Need at least one cigare to test"
        
        test_cigare = cigares[0]
        cigare_id = test_cigare.get("id")
        
        # Toggle favori from catalogue
        response = self.session.post(
            f"{BASE_URL}/api/favoris/toggle-from-catalogue",
            params={
                "membre_id": self.member_id,
                "cigare_catalogue_id": cigare_id
            }
        )
        
        assert response.status_code == 200, f"Toggle favori failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "favori" in data, "Response should contain 'favori' field"
        assert "message" in data, "Response should contain 'message' field"
        
        print(f"Toggle favori result: {data}")
        return cigare_id, data.get("favori")
    
    def test_get_ma_cigarotheque(self):
        """Test getting Ma Cigarthèque for member"""
        response = self.session.get(f"{BASE_URL}/api/ma-cigarotheque/{self.member_id}")
        
        assert response.status_code == 200, f"Failed to get Ma Cigarthèque: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Ma Cigarthèque has {len(data)} cigares")
        
        # Check if any have favori field
        favoris = [c for c in data if c.get("favori") == True]
        print(f"Found {len(favoris)} favoris in Ma Cigarthèque")
        
        return data
    
    def test_toggle_favori_in_ma_cigarotheque(self):
        """Test toggling favori for a cigare already in Ma Cigarthèque"""
        # First get Ma Cigarthèque
        collection_response = self.session.get(f"{BASE_URL}/api/ma-cigarotheque/{self.member_id}")
        assert collection_response.status_code == 200
        
        collection = collection_response.json()
        if len(collection) == 0:
            pytest.skip("No cigares in Ma Cigarthèque to test toggle")
        
        # Get first cigare
        test_cigare = collection[0]
        cigare_id = test_cigare.get("id")
        current_favori = test_cigare.get("favori", False)
        
        print(f"Testing toggle on cigare {cigare_id}, current favori: {current_favori}")
        
        # Toggle favori
        response = self.session.post(f"{BASE_URL}/api/ma-cigarotheque/{cigare_id}/favori")
        
        assert response.status_code == 200, f"Toggle favori failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("favori") != current_favori, "Favori should be toggled"
        
        print(f"Toggled favori from {current_favori} to {data.get('favori')}")
        
        # Toggle back to original state
        self.session.post(f"{BASE_URL}/api/ma-cigarotheque/{cigare_id}/favori")
        
        return cigare_id
    
    def test_get_favoris_endpoint(self):
        """Test getting favorites for a member"""
        response = self.session.get(f"{BASE_URL}/api/ma-cigarotheque/{self.member_id}/favoris")
        
        assert response.status_code == 200, f"Failed to get favoris: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Member has {len(data)} favoris")
        
        # Verify all returned items have favori=True in fiche_personnelle
        for fav in data:
            # The endpoint returns nested structure with fiche_personnelle and fiche_catalogue
            fiche = fav.get("fiche_personnelle", fav)
            assert fiche.get("favori") == True, f"All items should have favori=True, got: {fav}"
        
        print("All favoris verified successfully")
    
    def test_toggle_favori_from_catalogue_toggle_off(self):
        """Test removing a cigare from favorites via catalogue toggle"""
        # First add a cigare to favorites
        cigares_response = self.session.get(f"{BASE_URL}/api/cigares?limit=5")
        cigares = cigares_response.json().get("cigares", [])
        test_cigare = cigares[0]
        cigare_id = test_cigare.get("id")
        
        # First toggle (add to favorites)
        first_response = self.session.post(
            f"{BASE_URL}/api/favoris/toggle-from-catalogue",
            params={
                "membre_id": self.member_id,
                "cigare_catalogue_id": cigare_id
            }
        )
        assert first_response.status_code == 200
        first_state = first_response.json().get("favori")
        
        # Second toggle (should toggle off if was on, or on if was off)
        second_response = self.session.post(
            f"{BASE_URL}/api/favoris/toggle-from-catalogue",
            params={
                "membre_id": self.member_id,
                "cigare_catalogue_id": cigare_id
            }
        )
        assert second_response.status_code == 200
        second_state = second_response.json().get("favori")
        
        # States should be opposite
        assert first_state != second_state, f"Toggle should change state: {first_state} -> {second_state}"
        
        print(f"Toggle test passed: {first_state} -> {second_state}")
    
    def test_toggle_favori_nonexistent_cigare(self):
        """Test toggling favori for non-existent cigare in Ma Cigarthèque"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.post(f"{BASE_URL}/api/ma-cigarotheque/{fake_id}/favori")
        
        assert response.status_code == 404, f"Should return 404 for non-existent cigare: {response.status_code}"
        print("Correctly returned 404 for non-existent cigare")


class TestAperoClubFavoris:
    """Test favoris functionality for Apéro du Club cigares"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and get member info"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.member = data.get("member", {})
            self.member_id = self.member.get("id")
        else:
            pytest.skip("Login failed")
    
    def test_get_apero_club(self):
        """Test getting Apéro du Club cigares"""
        response = self.session.get(f"{BASE_URL}/api/apero-club")
        
        assert response.status_code == 200, f"Failed to get Apéro Club: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Apéro du Club has {len(data)} cigares")
        return data
    
    def test_toggle_favori_from_apero_club(self):
        """Test toggling favori for a cigare from Apéro du Club"""
        # Get Apéro Club cigares
        apero_response = self.session.get(f"{BASE_URL}/api/apero-club")
        assert apero_response.status_code == 200
        
        apero_cigares = apero_response.json()
        if len(apero_cigares) == 0:
            pytest.skip("No cigares in Apéro du Club to test")
        
        # Get first cigare's catalogue ID
        test_cigare = apero_cigares[0]
        cigare_catalogue_id = test_cigare.get("cigare_id")
        
        if not cigare_catalogue_id:
            pytest.skip("Apéro cigare has no cigare_id")
        
        print(f"Testing favori toggle for Apéro cigare: {test_cigare.get('marque')} (catalogue ID: {cigare_catalogue_id})")
        
        # Toggle favori using the catalogue endpoint
        response = self.session.post(
            f"{BASE_URL}/api/favoris/toggle-from-catalogue",
            params={
                "membre_id": self.member_id,
                "cigare_catalogue_id": cigare_catalogue_id
            }
        )
        
        assert response.status_code == 200, f"Toggle favori failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        print(f"Apéro Club favori toggle result: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

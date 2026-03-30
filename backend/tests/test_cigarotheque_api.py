"""
Test API endpoints for Cigarothèque features:
- Catalogue cigares (MySQL): GET /api/cigares, GET /api/cigares-filtres, PUT /api/cigares/{id}
- Ma Cigarthèque (MongoDB): GET/POST/PUT/DELETE /api/ma-cigarotheque
- Apéro du Club (MongoDB): GET/POST/DELETE /api/apero-club
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://membres-portal.preview.emergentagent.com').rstrip('/')

# Test member ID for Fabien Lanfranchi (admin/président)
TEST_MEMBRE_ID = "d6b30499-2c9b-43e4-9402-7234da4c9855"


class TestCatalogueCigares:
    """Tests for MySQL Catalogue cigares endpoints"""
    
    def test_get_cigares_list(self):
        """GET /api/cigares - Retrieve cigares list with pagination"""
        response = requests.get(f"{BASE_URL}/api/cigares", params={"limit": 20, "offset": 0})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cigares" in data, "Response should contain 'cigares' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["cigares"], list), "cigares should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        print(f"✓ GET /api/cigares: {len(data['cigares'])} cigares returned, total: {data['total']}")
    
    def test_get_cigares_with_search_filter(self):
        """GET /api/cigares - Search by marque/gamme"""
        response = requests.get(f"{BASE_URL}/api/cigares", params={"search": "Cohiba", "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        assert "cigares" in data
        print(f"✓ GET /api/cigares?search=Cohiba: {len(data['cigares'])} results")
    
    def test_get_cigares_with_pays_filter(self):
        """GET /api/cigares - Filter by pays_fabrication"""
        response = requests.get(f"{BASE_URL}/api/cigares", params={"pays": "Cuba", "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        assert "cigares" in data
        # Verify filtering works - all returned cigares should be from Cuba (if any)
        if data["cigares"]:
            for cigare in data["cigares"][:5]:
                if cigare.get("pays_fabrication"):
                    assert cigare["pays_fabrication"] == "Cuba", f"Expected Cuba, got {cigare['pays_fabrication']}"
        print(f"✓ GET /api/cigares?pays=Cuba: {len(data['cigares'])} results")
    
    def test_get_cigares_with_puissance_filter(self):
        """GET /api/cigares - Filter by puissance (A/B/C)"""
        response = requests.get(f"{BASE_URL}/api/cigares", params={"puissance": "A", "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        assert "cigares" in data
        # Verify all returned cigares have puissance A
        if data["cigares"]:
            for cigare in data["cigares"][:5]:
                if cigare.get("puissance"):
                    assert cigare["puissance"] == "A", f"Expected puissance A, got {cigare['puissance']}"
        print(f"✓ GET /api/cigares?puissance=A: {len(data['cigares'])} results")
    
    def test_get_cigares_with_prix_filter(self):
        """GET /api/cigares - Filter by prix range"""
        response = requests.get(f"{BASE_URL}/api/cigares", params={"prix_min": 10, "prix_max": 50, "limit": 20})
        
        assert response.status_code == 200
        data = response.json()
        assert "cigares" in data
        # Verify prix is within range
        if data["cigares"]:
            for cigare in data["cigares"][:5]:
                if cigare.get("prix"):
                    assert 10 <= cigare["prix"] <= 50, f"Prix {cigare['prix']} not in range 10-50"
        print(f"✓ GET /api/cigares?prix_min=10&prix_max=50: {len(data['cigares'])} results")
    
    def test_get_cigares_pagination(self):
        """GET /api/cigares - Test pagination works correctly"""
        # Get first page
        response1 = requests.get(f"{BASE_URL}/api/cigares", params={"limit": 5, "offset": 0})
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get second page
        response2 = requests.get(f"{BASE_URL}/api/cigares", params={"limit": 5, "offset": 5})
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Pages should have different content (assuming total > 5)
        if data1["total"] > 5:
            assert data1["cigares"] != data2["cigares"], "Pagination should return different results"
        print(f"✓ Pagination works: page1={len(data1['cigares'])}, page2={len(data2['cigares'])}")


class TestCigaresFiltres:
    """Tests for filter options endpoint"""
    
    def test_get_filtres(self):
        """GET /api/cigares-filtres - Get filter options"""
        response = requests.get(f"{BASE_URL}/api/cigares-filtres")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pays" in data, "Should contain pays list"
        assert "marques" in data, "Should contain marques list"
        assert "puissances" in data, "Should contain puissances list"
        assert "vitoles" in data, "Should contain vitoles list"
        
        assert isinstance(data["pays"], list), "pays should be a list"
        assert isinstance(data["marques"], list), "marques should be a list"
        
        print(f"✓ GET /api/cigares-filtres: {len(data['marques'])} marques, {len(data['pays'])} pays, {len(data['puissances'])} puissances")


class TestCigareUpdate:
    """Tests for updating cigare in catalogue (admin feature)"""
    
    def test_update_cigare(self):
        """PUT /api/cigares/{id} - Update a cigare's fields"""
        # First get a cigare to update
        get_response = requests.get(f"{BASE_URL}/api/cigares", params={"limit": 1})
        assert get_response.status_code == 200
        
        cigares = get_response.json().get("cigares", [])
        if not cigares:
            pytest.skip("No cigares available to test update")
        
        cigare_id = cigares[0]["id"]
        original_conclusion = cigares[0].get("conclusion", "")
        
        # Update with test value
        test_conclusion = f"TEST_UPDATE_{uuid.uuid4().hex[:8]}"
        update_response = requests.put(
            f"{BASE_URL}/api/cigares/{cigare_id}",
            json={"conclusion": test_conclusion}
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update by getting the cigare again
        verify_response = requests.get(f"{BASE_URL}/api/cigares/{cigare_id}")
        assert verify_response.status_code == 200
        
        updated_cigare = verify_response.json()
        assert updated_cigare.get("conclusion") == test_conclusion, "Conclusion was not updated"
        
        # Restore original value
        requests.put(f"{BASE_URL}/api/cigares/{cigare_id}", json={"conclusion": original_conclusion or None})
        
        print(f"✓ PUT /api/cigares/{cigare_id}: Update and verify successful")
    
    def test_update_cigare_not_found(self):
        """PUT /api/cigares/{id} - Non-existent cigare returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/cigares/999999",
            json={"conclusion": "test"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent cigare, got {response.status_code}"
        print("✓ PUT /api/cigares/999999: Returns 404 for non-existent cigare")


class TestAperoClub:
    """Tests for Apéro du Club endpoints (MongoDB)"""
    
    def test_get_apero_club_list(self):
        """GET /api/apero-club - Get all cigares from Apéro du Club"""
        response = requests.get(f"{BASE_URL}/api/apero-club")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/apero-club: {len(data)} cigares in Apéro du Club")
    
    def test_add_and_delete_apero_club_cigare(self):
        """POST /api/apero-club - Add cigare to Apéro du Club, then DELETE it"""
        # Create test cigare
        test_cigare = {
            "cigare_id": 1,
            "marque": "TEST_MARQUE",
            "gamme": "TEST_GAMME",
            "vitole": "TEST_VITOLE",
            "pays": "Cuba",
            "puissance": "B",
            "prix": 25.50,
            "date_apero": datetime.now().strftime("%Y-%m-%d")
        }
        
        # Add to apero club
        add_response = requests.post(f"{BASE_URL}/api/apero-club", json=test_cigare)
        assert add_response.status_code == 200, f"Add failed: {add_response.text}"
        
        add_data = add_response.json()
        assert "cigare" in add_data, "Response should contain 'cigare'"
        cigare_id = add_data["cigare"]["id"]
        
        print(f"✓ POST /api/apero-club: Added cigare {cigare_id}")
        
        # Verify it's in the list
        list_response = requests.get(f"{BASE_URL}/api/apero-club")
        assert list_response.status_code == 200
        cigares = list_response.json()
        
        found = any(c["id"] == cigare_id for c in cigares)
        assert found, "Added cigare should be in the list"
        
        # Delete the test cigare
        delete_response = requests.delete(f"{BASE_URL}/api/apero-club/{cigare_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        list_response2 = requests.get(f"{BASE_URL}/api/apero-club")
        cigares2 = list_response2.json()
        not_found = all(c["id"] != cigare_id for c in cigares2)
        assert not_found, "Deleted cigare should not be in the list"
        
        print(f"✓ DELETE /api/apero-club/{cigare_id}: Cigare removed successfully")


class TestMaCigarotheque:
    """Tests for Ma Cigarthèque (personal collection) endpoints"""
    
    def test_get_ma_cigarotheque(self):
        """GET /api/ma-cigarotheque/{membre_id} - Get personal collection"""
        response = requests.get(f"{BASE_URL}/api/ma-cigarotheque/{TEST_MEMBRE_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/ma-cigarotheque/{TEST_MEMBRE_ID}: {len(data)} cigares in personal collection")
    
    def test_add_cigare_to_collection(self):
        """POST /api/ma-cigarotheque - Add cigare to personal collection"""
        test_cigare = {
            "membre_id": TEST_MEMBRE_ID,
            "cigare_id": 1,
            "marque": "TEST_PERSONAL_CIGARE",
            "gamme": "Test Gamme",
            "vitole": "Test Vitole",
            "pays": "Nicaragua",
            "puissance": "A",
            "prix": 15.00
        }
        
        response = requests.post(f"{BASE_URL}/api/ma-cigarotheque", json=test_cigare)
        assert response.status_code == 200, f"Add failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "cigare" in data, "Response should contain 'cigare'"
        self.created_cigare_id = data["cigare"]["id"]
        
        print(f"✓ POST /api/ma-cigarotheque: Added cigare {self.created_cigare_id}")
        return self.created_cigare_id
    
    def test_update_cigare_note(self):
        """PUT /api/ma-cigarotheque/{cigare_id} - Update note and comment"""
        # First add a cigare
        test_cigare = {
            "membre_id": TEST_MEMBRE_ID,
            "cigare_id": 2,
            "marque": "TEST_NOTE_UPDATE",
            "gamme": "Test Gamme",
            "vitole": "Test Vitole",
            "pays": "Honduras",
            "puissance": "C",
            "prix": 12.00
        }
        
        add_response = requests.post(f"{BASE_URL}/api/ma-cigarotheque", json=test_cigare)
        assert add_response.status_code == 200
        cigare_id = add_response.json()["cigare"]["id"]
        
        # Update with note and comment
        update_response = requests.put(
            f"{BASE_URL}/api/ma-cigarotheque/{cigare_id}",
            params={"note": 4.5, "commentaire": "Excellent cigare, très équilibré"}
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/ma-cigarotheque/{TEST_MEMBRE_ID}")
        assert get_response.status_code == 200
        
        cigares = get_response.json()
        updated_cigare = next((c for c in cigares if c["id"] == cigare_id), None)
        
        assert updated_cigare is not None, "Updated cigare should exist"
        assert updated_cigare.get("note_personnelle") == 4.5, f"Note should be 4.5, got {updated_cigare.get('note_personnelle')}"
        assert updated_cigare.get("commentaire") == "Excellent cigare, très équilibré", "Comment mismatch"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/ma-cigarotheque/{cigare_id}")
        
        print(f"✓ PUT /api/ma-cigarotheque/{cigare_id}: Note and comment updated")
    
    def test_delete_cigare_from_collection(self):
        """DELETE /api/ma-cigarotheque/{cigare_id} - Remove cigare from collection"""
        # First add a cigare
        test_cigare = {
            "membre_id": TEST_MEMBRE_ID,
            "cigare_id": 3,
            "marque": "TEST_DELETE_CIGARE",
            "gamme": "Delete Test",
            "vitole": "Robusto",
            "pays": "Dominican Republic",
            "puissance": "B",
            "prix": 20.00
        }
        
        add_response = requests.post(f"{BASE_URL}/api/ma-cigarotheque", json=test_cigare)
        assert add_response.status_code == 200
        cigare_id = add_response.json()["cigare"]["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/ma-cigarotheque/{cigare_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/ma-cigarotheque/{TEST_MEMBRE_ID}")
        cigares = get_response.json()
        
        found = any(c["id"] == cigare_id for c in cigares)
        assert not found, "Deleted cigare should not be in the collection"
        
        print(f"✓ DELETE /api/ma-cigarotheque/{cigare_id}: Cigare removed from collection")


class TestCigareDetail:
    """Tests for single cigare detail endpoint"""
    
    def test_get_cigare_detail(self):
        """GET /api/cigares/{id} - Get single cigare details"""
        # First get a cigare ID from the list
        list_response = requests.get(f"{BASE_URL}/api/cigares", params={"limit": 1})
        assert list_response.status_code == 200
        
        cigares = list_response.json().get("cigares", [])
        if not cigares:
            pytest.skip("No cigares available")
        
        cigare_id = cigares[0]["id"]
        
        # Get detail
        detail_response = requests.get(f"{BASE_URL}/api/cigares/{cigare_id}")
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        
        cigare = detail_response.json()
        assert cigare["id"] == cigare_id, "ID mismatch"
        print(f"✓ GET /api/cigares/{cigare_id}: Got detail for {cigare.get('marque', 'N/A')} {cigare.get('gamme', '')}")
    
    def test_get_cigare_detail_not_found(self):
        """GET /api/cigares/{id} - Non-existent cigare returns 404"""
        response = requests.get(f"{BASE_URL}/api/cigares/999999")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/cigares/999999: Returns 404 for non-existent cigare")


# Cleanup helper - run after tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup any test data after all tests complete"""
    yield
    
    # Clean up any TEST_ prefixed cigares in personal collection
    try:
        response = requests.get(f"{BASE_URL}/api/ma-cigarotheque/{TEST_MEMBRE_ID}")
        if response.status_code == 200:
            cigares = response.json()
            for cigare in cigares:
                if cigare.get("marque", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/ma-cigarotheque/{cigare['id']}")
                    print(f"Cleaned up test cigare: {cigare['id']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")
    
    # Clean up any TEST_ prefixed cigares in apero club
    try:
        response = requests.get(f"{BASE_URL}/api/apero-club")
        if response.status_code == 200:
            cigares = response.json()
            for cigare in cigares:
                if cigare.get("marque", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/apero-club/{cigare['id']}")
                    print(f"Cleaned up apero cigare: {cigare['id']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

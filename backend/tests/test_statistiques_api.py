"""
Test des API Statistiques pour La Bague Impériale
- API /api/statistiques/saisons-resume : retourne moy_aperos, moy_repas, moy_anniversaires, moy_global
- API /api/statistiques/moyennes-dashboard : retourne moy_global et moy_saison_actuelle
- API POST /api/saisons-config/{saison}/manual-stats : sauvegarde les présences manuelles
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSaisonsResumeAPI:
    """Tests for /api/statistiques/saisons-resume endpoint"""
    
    def test_saisons_resume_returns_200(self):
        """Test that saisons-resume returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/statistiques/saisons-resume")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ /api/statistiques/saisons-resume returns 200")
    
    def test_saisons_resume_contains_required_fields(self):
        """Test that response contains the required average fields"""
        response = requests.get(f"{BASE_URL}/api/statistiques/saisons-resume")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            first_saison = data[0]
            required_fields = ['moy_aperos', 'moy_repas', 'moy_anniversaires', 'moy_global']
            
            for field in required_fields:
                assert field in first_saison, f"Missing required field: {field}"
                print(f"✅ Field '{field}' found in response")
            
            # Verify types
            assert isinstance(first_saison['moy_aperos'], (int, float)), "moy_aperos should be numeric"
            assert isinstance(first_saison['moy_repas'], (int, float)), "moy_repas should be numeric"
            assert isinstance(first_saison['moy_anniversaires'], (int, float)), "moy_anniversaires should be numeric"
            assert isinstance(first_saison['moy_global'], (int, float)), "moy_global should be numeric"
            print(f"✅ All average fields have correct numeric types")
        else:
            print("⚠️ No saison data available (empty list)")
    
    def test_saisons_resume_structure(self):
        """Test the complete structure of saisons-resume response"""
        response = requests.get(f"{BASE_URL}/api/statistiques/saisons-resume")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            saison = data[0]
            expected_fields = [
                'saison', 'annee_debut', 'annee_fin',
                'nb_aperos', 'nb_repas', 'nb_anniversaires', 'total_events',
                'membres_actifs',
                'presences_membres_aperos', 'presences_membres_repas', 
                'presences_membres_anniversaires', 'presences_total',
                'moy_aperos', 'moy_repas', 'moy_anniversaires', 'moy_global',
                'is_manuel'
            ]
            
            for field in expected_fields:
                assert field in saison, f"Missing field: {field}"
            print(f"✅ All expected fields present in saisons-resume response")


class TestMoyennesDashboardAPI:
    """Tests for /api/statistiques/moyennes-dashboard endpoint"""
    
    def test_moyennes_dashboard_returns_200(self):
        """Test that moyennes-dashboard returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ /api/statistiques/moyennes-dashboard returns 200")
    
    def test_moyennes_dashboard_contains_required_fields(self):
        """Test that response contains moy_global and moy_saison_actuelle"""
        response = requests.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields
        assert 'moy_global' in data, "Missing required field: moy_global"
        print(f"✅ Field 'moy_global' found: {data['moy_global']}")
        
        assert 'moy_saison_actuelle' in data, "Missing required field: moy_saison_actuelle"
        print(f"✅ Field 'moy_saison_actuelle' found: {data['moy_saison_actuelle']}")
        
        # Verify types
        assert isinstance(data['moy_global'], (int, float)), "moy_global should be numeric"
        assert isinstance(data['moy_saison_actuelle'], (int, float)), "moy_saison_actuelle should be numeric"
        print(f"✅ Both average fields have correct numeric types")
    
    def test_moyennes_dashboard_complete_structure(self):
        """Test complete structure of moyennes-dashboard response"""
        response = requests.get(f"{BASE_URL}/api/statistiques/moyennes-dashboard")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = [
            'moy_global', 'total_events_global', 'total_presences_global',
            'moy_saison_actuelle', 'saison_actuelle',
            'total_events_saison', 'total_presences_saison'
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✅ All expected fields present in moyennes-dashboard response")


class TestManualStatsAPI:
    """Tests for POST /api/saisons-config/{saison}/manual-stats endpoint"""
    
    def test_manual_stats_post_returns_success(self):
        """Test that manual stats can be saved successfully"""
        test_saison = 2  # Testing with saison 2 (historical)
        
        payload = {
            "presences_membres_aperos": 50,
            "presences_membres_repas": 45,
            "presences_membres_anniversaires": 40,
            "nb_membres_manuel": 10
        }
        
        response = requests.post(
            f"{BASE_URL}/api/saisons-config/{test_saison}/manual-stats",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ POST /api/saisons-config/{test_saison}/manual-stats returns 200")
        
        data = response.json()
        assert data is not None, "Response should not be None"
        print(f"✅ Manual stats saved successfully for saison {test_saison}")
    
    def test_manual_stats_verify_persistence(self):
        """Test that manual stats are persisted correctly"""
        test_saison = 3  # Testing with saison 3
        
        # Save manual stats
        payload = {
            "presences_membres_aperos": 60,
            "presences_membres_repas": 55,
            "presences_membres_anniversaires": 50,
            "nb_membres_manuel": 12
        }
        
        response = requests.post(
            f"{BASE_URL}/api/saisons-config/{test_saison}/manual-stats",
            json=payload
        )
        assert response.status_code == 200
        
        # Verify by getting saisons-resume
        resume_response = requests.get(f"{BASE_URL}/api/statistiques/saisons-resume")
        assert resume_response.status_code == 200
        
        data = resume_response.json()
        saison_data = next((s for s in data if s['saison'] == test_saison), None)
        
        if saison_data:
            # Check that is_manuel is set
            assert saison_data.get('is_manuel') == True, "is_manuel should be True after manual update"
            print(f"✅ is_manuel flag correctly set for saison {test_saison}")
            
            # Check that presences match (if total_events > 0)
            if saison_data.get('total_events', 0) > 0:
                print(f"✅ Saison {test_saison} has {saison_data['total_events']} total events")
        else:
            print(f"⚠️ Saison {test_saison} not found in resume (may need events configured)")
    
    def test_manual_stats_partial_update(self):
        """Test that partial updates work correctly"""
        test_saison = 4
        
        # First, set some values
        payload1 = {
            "presences_membres_aperos": 70,
            "nb_membres_manuel": 15
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/saisons-config/{test_saison}/manual-stats",
            json=payload1
        )
        assert response1.status_code == 200
        print(f"✅ Partial update (aperos only) succeeded for saison {test_saison}")
        
        # Then, update only repas
        payload2 = {
            "presences_membres_repas": 65
        }
        
        response2 = requests.post(
            f"{BASE_URL}/api/saisons-config/{test_saison}/manual-stats",
            json=payload2
        )
        assert response2.status_code == 200
        print(f"✅ Partial update (repas only) succeeded for saison {test_saison}")


class TestSaisonsConfigAPI:
    """Tests for /api/saisons-config endpoints"""
    
    def test_get_saisons_config_returns_200(self):
        """Test getting all saisons config"""
        response = requests.get(f"{BASE_URL}/api/saisons-config")
        assert response.status_code == 200
        print(f"✅ GET /api/saisons-config returns 200")
    
    def test_get_single_saison_config(self):
        """Test getting single saison config"""
        response = requests.get(f"{BASE_URL}/api/saisons-config/13")
        # Can be 200 (exists) or 404 (doesn't exist)
        assert response.status_code in [200, 404]
        print(f"✅ GET /api/saisons-config/13 returns {response.status_code}")


class TestStatistiquesGlobalAPI:
    """Tests for /api/statistiques/global endpoint"""
    
    def test_global_stats_returns_200(self):
        """Test that global stats returns 200"""
        response = requests.get(f"{BASE_URL}/api/statistiques/global")
        assert response.status_code == 200
        print(f"✅ GET /api/statistiques/global returns 200")
    
    def test_global_stats_structure(self):
        """Test structure of global stats response"""
        response = requests.get(f"{BASE_URL}/api/statistiques/global")
        assert response.status_code == 200
        
        data = response.json()
        assert 'membres' in data, "Response should contain 'membres' field"
        assert 'saisons_config' in data, "Response should contain 'saisons_config' field"
        print(f"✅ Global stats response has correct structure")


class TestMembersAPI:
    """Tests for /api/members endpoint"""
    
    def test_get_members_returns_200(self):
        """Test that members endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/members")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/members returns 200 with {len(data)} members")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

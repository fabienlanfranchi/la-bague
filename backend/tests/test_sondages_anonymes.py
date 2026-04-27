"""
Tests for sondages-generiques anonymity and voting flow.
Covers:
- POST /api/sondages-generiques/{id}/vote with multi-question body
- GET /api/sondages-generiques does NOT expose voter IDs (only aggregated)
- Double vote prevention (update existing vote)
- GET /api/sondages-generiques/{id}/mon-vote/{membre_id}
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://imperial-cigars.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Known test sondage id (created prior by main agent)
TEST_SONDAGE_ID = "72e10e79-d634-4ae4-ba92-9b7ee43e9508"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def jacques_id(session):
    r = session.get(f"{API}/members")
    assert r.status_code == 200, r.text
    members = r.json()
    for m in members:
        if m.get("nom_complet") == "Jacques Peretti":
            return m["id"]
    pytest.skip("Jacques Peretti not found")


@pytest.fixture(scope="module")
def sondage_test(session):
    """Create a new test sondage with 2 questions for isolated tests."""
    payload = {
        "question": "Test Sondage Anonymat",
        "questions": [
            {
                "question": "Question 1 - Couleur préférée?",
                "options": ["Rouge", "Bleu", "Vert"]
            },
            {
                "question": "Question 2 - Taille de cigare?",
                "options": ["Robusto", "Churchill", "Corona"]
            }
        ],
        "actif": True
    }
    r = session.post(f"{API}/sondages-generiques", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    sid = data["sondage"]["id"]
    yield sid
    # cleanup
    session.delete(f"{API}/sondages-generiques/{sid}")


def test_list_sondages_no_voter_leakage(session):
    """GET /api/sondages-generiques must NOT expose individual voter identities."""
    r = session.get(f"{API}/sondages-generiques")
    assert r.status_code == 200
    sondages = r.json()
    assert isinstance(sondages, list)
    # Scan every sondage dict for leaked voter info
    leak_keys = {"votes_list", "voters", "membre_ids", "voter_ids"}
    for s in sondages:
        keys = set(s.keys())
        assert not (keys & leak_keys), f"Leak detected: {keys & leak_keys}"
        # Questions should expose vote_counts not voter list
        for q in s.get("questions") or []:
            assert "vote_counts" in q
            assert "voters" not in q
            assert "membre_ids" not in q


def test_vote_multi_question(session, sondage_test, jacques_id):
    """POST vote with {membre_id, reponses:[{question_index, option_index}]}"""
    payload = {
        "membre_id": jacques_id,
        "reponses": [
            {"question_index": 0, "option_index": 1},  # Bleu
            {"question_index": 1, "option_index": 2},  # Corona
        ]
    }
    r = session.post(f"{API}/sondages-generiques/{sondage_test}/vote", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "message" in body


def test_mon_vote_returns_correct_vote(session, sondage_test, jacques_id):
    r = session.get(f"{API}/sondages-generiques/{sondage_test}/mon-vote/{jacques_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["hasVoted"] is True
    reponses = data.get("reponses", [])
    assert len(reponses) == 2
    # verify content
    by_qi = {rep["question_index"]: rep["option_index"] for rep in reponses}
    assert by_qi.get(0) == 1
    assert by_qi.get(1) == 2


def test_mon_vote_inexistent(session, sondage_test):
    fake_id = "00000000-0000-0000-0000-000000000000"
    r = session.get(f"{API}/sondages-generiques/{sondage_test}/mon-vote/{fake_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["hasVoted"] is False


def test_double_vote_prevention_updates_existing(session, sondage_test, jacques_id):
    """Voting again updates the vote, does not duplicate."""
    # Vote again with different answers
    payload = {
        "membre_id": jacques_id,
        "reponses": [
            {"question_index": 0, "option_index": 0},  # Rouge
            {"question_index": 1, "option_index": 0},  # Robusto
        ]
    }
    r = session.post(f"{API}/sondages-generiques/{sondage_test}/vote", json=payload)
    assert r.status_code == 200
    assert "mis à jour" in r.json()["message"].lower() or "mis a jour" in r.json()["message"].lower()

    # Total votes must still be 1 (aggregated)
    r2 = session.get(f"{API}/sondages-generiques")
    sondages = r2.json()
    target = next((s for s in sondages if s["id"] == sondage_test), None)
    assert target is not None
    assert target["total_votes"] == 1

    # Verify updated selection reflected
    r3 = session.get(f"{API}/sondages-generiques/{sondage_test}/mon-vote/{jacques_id}")
    by_qi = {rep["question_index"]: rep["option_index"] for rep in r3.json()["reponses"]}
    assert by_qi[0] == 0
    assert by_qi[1] == 0


def test_vote_missing_membre_id_rejected(session, sondage_test):
    payload = {"reponses": [{"question_index": 0, "option_index": 0}]}
    r = session.post(f"{API}/sondages-generiques/{sondage_test}/vote", json=payload)
    assert r.status_code == 400


def test_aggregated_vote_counts_update(session, sondage_test, jacques_id):
    """After Jacques' updated vote, vote_counts should show 1 for Rouge (0,0) and Robusto (1,0)."""
    r = session.get(f"{API}/sondages-generiques")
    sondages = r.json()
    target = next((s for s in sondages if s["id"] == sondage_test), None)
    assert target is not None
    questions = target.get("questions", [])
    assert len(questions) == 2
    assert questions[0]["vote_counts"][0] == 1  # Rouge
    assert questions[1]["vote_counts"][0] == 1  # Robusto
    # other options = 0
    assert sum(questions[0]["vote_counts"]) == 1
    assert sum(questions[1]["vote_counts"]) == 1


def test_preexisting_sondage_endpoint_anonymity(session):
    """Test sondage 72e10e79... - ensure no voter info in GET."""
    r = session.get(f"{API}/sondages-generiques")
    assert r.status_code == 200
    sondages = r.json()
    target = next((s for s in sondages if s["id"] == TEST_SONDAGE_ID), None)
    if target is None:
        pytest.skip("Preexisting test sondage not found")
    # no voter leak
    assert "voters" not in target
    assert "membre_ids" not in target
    for q in target.get("questions") or []:
        assert "voters" not in q

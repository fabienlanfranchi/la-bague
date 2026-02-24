#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid

MONGO_URL = "mongodb://localhost:27017"

# Liste complète simplifié : Saisons 1 à 13
EVENTS = [
    # Saison 1 - 2013
    *[{"date": f"2013-{m:02d}-15", "objet": f"Repas S1-{i}", "lieu": "Restaurant", "saison": 1} for i, m in enumerate([4,5,6,7,8,9,10,11,12], 1)],
    *[{"date": f"2014-{m:02d}-15", "objet": f"Repas S1-{i}", "lieu": "Restaurant", "saison": 1} for i, m in enumerate([1,2,3,4], 10)],
    
    # Import direct des événements réels extraits
    # Saison 13 (en cours) - 2025-2026
    {"date": "2024-07-21", "objet": "Pavillon Général", "lieu": "Pavillon Général", "saison": 13, "statut": "terminé"},
    {"date": "2024-09-01", "objet": "Comptoir Italien", "lieu": "Comptoir Italien", "saison": 13, "statut": "terminé"},
    {"date": "2024-09-15", "objet": "A Conca Prunelli", "lieu": "A Conca Prunelli", "saison": 13, "statut": "terminé"},
    {"date": "2024-09-15", "objet": "Auberge du Prunelli", "lieu": "Auberge du Prunelli", "saison": 13, "statut": "terminé"},
    {"date": "2024-09-29", "objet": "A Conca", "lieu": "A Conca", "saison": 13, "statut": "terminé"},
    {"date": "2024-10-13", "objet": "A Conca Ajaccio", "lieu": "A Conca Ajaccio", "saison": 13, "statut": "terminé"},
    {"date": "2024-10-27", "objet": "A Conca", "lieu": "A Conca", "saison": 13, "statut": "terminé"},
    {"date": "2024-11-17", "objet": "Vent d'Ange", "lieu": "Vent d'Ange", "saison": 13, "statut": "terminé"},
    {"date": "2024-12-15", "objet": "St Georges", "lieu": "St Georges", "saison": 13, "statut": "terminé"},
    {"date": "2025-01-04", "objet": "A Conca", "lieu": "A Conca", "saison": 13, "statut": "terminé"},
    {"date": "2025-01-18", "objet": "La Closerie", "lieu": "La Closerie", "saison": 13, "statut": "terminé"},
    {"date": "2025-02-03", "objet": "A Conca", "lieu": "A Conca", "saison": 13, "statut": "terminé"},
    {"date": "2025-02-16", "objet": "Directoire", "lieu": "Directoire", "saison": 13, "statut": "terminé"},
]

async def import_events():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["test_database"]
    
    # Nettoyer les événements existants
    result = await db.evenements.delete_many({})
    print(f"✅ {result.deleted_count} événements supprimés")
    
    # Importer les nouveaux événements
    count = 0
    for evt_data in EVENTS:
        evt = {
            "id": str(uuid.uuid4()),
            "date": datetime.fromisoformat(evt_data["date"]).isoformat(),
            "objet": evt_data["objet"],
            "lieu": evt_data["lieu"],
            "type_sondage": "repas",
            "statut": evt_data.get("statut", "terminé"),
            "saison": evt_data["saison"],
            "options_sondage": None,
            "created_at": datetime.now().isoformat()
        }
        await db.evenements.insert_one(evt)
        count += 1
    
    print(f"✅ {count} événements importés")
    
    # Stats par saison
    for s in range(1, 14):
        nb = await db.evenements.count_documents({"saison": s})
        print(f"  Saison {s}: {nb} événements")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_events())

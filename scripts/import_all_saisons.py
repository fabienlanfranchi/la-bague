#!/usr/bin/env python3
"""Import complet saisons 2-12 avec nombres de présents"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid

MONGO_URL = "mongodb://localhost:27017"

# Toutes les données extraites avec les VRAIS nombres
EVENTS_SAISONS_2_12 = [
    # SAISON 2
    {"saison": 2, "lieu": "San Carlu", "date": "2014-05-01", "presents": 21, "type": "repas"},
    {"saison": 2, "lieu": "Casabianca", "date": "2014-06-01", "presents": 20, "type": "repas"},
    {"saison": 2, "lieu": "Jean-Jean", "date": "2014-07-01", "presents": 20, "type": "repas"},
    {"saison": 2, "lieu": "Roc 72", "date": "2014-08-01", "presents": 17, "type": "repas"},
    {"saison": 2, "lieu": "Bistrot d'Emile", "date": "2014-09-22", "presents": 15, "type": "repas"},
    {"saison": 2, "lieu": "A Conca", "date": "2014-09-06", "presents": 10, "type": "repas"},
    {"saison": 2, "lieu": "Rive Sud", "date": "2014-10-24", "presents": 14, "type": "repas"},
    {"saison": 2, "lieu": "Albert 1er", "date": "2014-11-03", "presents": 14, "type": "repas"},
    {"saison": 2, "lieu": "Roi de Rome", "date": "2014-11-17", "presents": 17, "type": "repas"},
    {"saison": 2, "lieu": "Comptoir Ajaccien", "date": "2014-12-01", "presents": 11, "type": "repas"},
    {"saison": 2, "lieu": "Bel Messere", "date": "2014-12-15", "presents": 16, "type": "repas"},
    {"saison": 2, "lieu": "St Georges", "date": "2015-01-19", "presents": 21, "type": "repas"},
    {"saison": 2, "lieu": "A Conca", "date": "2015-02-02", "presents": 9, "type": "repas"},
    {"saison": 2, "lieu": "Roi de Rome", "date": "2015-02-16", "presents": 13, "type": "repas"},
    {"saison": 2, "lieu": "Albert 1er", "date": "2015-03-02", "presents": 10, "type": "repas"},
    {"saison": 2, "lieu": "Palm Beach", "date": "2015-03-16", "presents": 18, "type": "repas"},
    {"saison": 2, "lieu": "Comptoir", "date": "2015-03-31", "presents": 9, "type": "repas"},
    {"saison": 2, "lieu": "Palais des congrès", "date": "2015-04-25", "presents": 24, "type": "anniversaire"},
    
    # SAISON 3
    {"saison": 3, "lieu": "Bistrot d'Emile", "date": "2015-09-21", "presents": 17, "type": "repas"},
    {"saison": 3, "lieu": "A Conca", "date": "2015-10-05", "presents": 12, "type": "repas"},
    {"saison": 3, "lieu": "Rive Sud", "date": "2015-10-19", "presents": 16, "type": "repas"},
    {"saison": 3, "lieu": "Albert 1er", "date": "2015-11-02", "presents": 12, "type": "repas"},
    {"saison": 3, "lieu": "Roi de Rome", "date": "2015-11-16", "presents": 21, "type": "repas"},
    {"saison": 3, "lieu": "A Conca", "date": "2015-11-30", "presents": 9, "type": "repas"},
    {"saison": 3, "lieu": "St Georges", "date": "2015-12-14", "presents": 27, "type": "repas"},
    {"saison": 3, "lieu": "Bel Messere", "date": "2015-12-18", "presents": 12, "type": "repas"},
    
    # SAISON 4
    {"saison": 4, "lieu": "A Conca", "date": "2016-09-05", "presents": 10, "type": "repas"},
    {"saison": 4, "lieu": "Auberge Ajaccienne", "date": "2016-10-19", "presents": 17, "type": "repas"},
    {"saison": 4, "lieu": "Rive Sud", "date": "2016-11-16", "presents": 14, "type": "repas"},
    {"saison": 4, "lieu": "A Conca", "date": "2016-11-30", "presents": 10, "type": "repas"},
    {"saison": 4, "lieu": "Saint Georges", "date": "2016-12-19", "presents": 23, "type": "repas"},
    {"saison": 4, "lieu": "Roi de Rome", "date": "2017-01-18", "presents": 22, "type": "repas"},
    {"saison": 4, "lieu": "A Conca", "date": "2017-02-01", "presents": 9, "type": "repas"},
    {"saison": 4, "lieu": "Côté Plage", "date": "2017-02-22", "presents": 13, "type": "repas"},
    
    # SAISON 5
    {"saison": 5, "lieu": "Le Directoire", "date": "2017-10-06", "presents": 13, "type": "repas"},
    {"saison": 5, "lieu": "A Conca", "date": "2017-10-16", "presents": 13, "type": "repas"},
    {"saison": 5, "lieu": "Auberge Ajaccienne", "date": "2017-10-30", "presents": 11, "type": "repas"},
    {"saison": 5, "lieu": "A Conca", "date": "2017-11-20", "presents": 19, "type": "repas"},
    {"saison": 5, "lieu": "Bistrot Bonaparte", "date": "2017-11-19", "presents": 22, "type": "repas"},
    {"saison": 5, "lieu": "St Georges", "date": "2018-01-08", "presents": 11, "type": "repas"},
    {"saison": 5, "lieu": "A Conca", "date": "2018-01-22", "presents": 18, "type": "repas"},
    {"saison": 5, "lieu": "Roi de Rome", "date": "2018-02-05", "presents": 18, "type": "repas"},
    
    # SAISON 6
    {"saison": 6, "lieu": "A Conca", "date": "2018-11-17", "presents": 9, "type": "repas"},
    {"saison": 6, "lieu": "Bistrot Bonaparte", "date": "2018-11-26", "presents": 14, "type": "repas"},
    {"saison": 6, "lieu": "St Georges", "date": "2018-12-17", "presents": 21, "type": "repas"},
    {"saison": 6, "lieu": "A Conca", "date": "2019-01-07", "presents": 13, "type": "repas"},
    {"saison": 6, "lieu": "Roi de Rome", "date": "2019-02-20", "presents": 9, "type": "repas"},
    {"saison": 6, "lieu": "A Conca", "date": "2019-02-04", "presents": 12, "type": "repas"},
    {"saison": 6, "lieu": "A Conca", "date": "2019-03-04", "presents": 12, "type": "repas"},
    {"saison": 6, "lieu": "Le Petit Restaurant", "date": "2019-03-18", "presents": 19, "type": "repas"},
    
    # SAISON 7
    {"saison": 7, "lieu": "Baronu", "date": "2019-10-14", "presents": 17, "type": "repas"},
    {"saison": 7, "lieu": "Bistrot Bonaparte", "date": "2019-11-04", "presents": 16, "type": "repas"},
    {"saison": 7, "lieu": "A Conca", "date": "2019-05-18", "presents": 12, "type": "repas"},
    {"saison": 7, "lieu": "St Georges", "date": "2019-12-16", "presents": 21, "type": "repas"},
    {"saison": 7, "lieu": "Le Directoire", "date": "2020-01-13", "presents": 13, "type": "repas"},
    {"saison": 7, "lieu": "U Baronu", "date": "2020-01-27", "presents": 13, "type": "repas"},
    {"saison": 7, "lieu": "Patio d'AM", "date": "2020-02-10", "presents": 14, "type": "repas"},
    {"saison": 7, "lieu": "A Conca", "date": "2020-02-24", "presents": 8, "type": "repas"},
    
    # SAISON 8
    {"saison": 8, "lieu": "Moorea", "date": "2020-08-03", "presents": 12, "type": "repas"},
    {"saison": 8, "lieu": "Jean Jean", "date": "2020-09-07", "presents": 16, "type": "repas"},
    {"saison": 8, "lieu": "U Baronu", "date": "2020-09-21", "presents": 16, "type": "repas"},
    {"saison": 8, "lieu": "La Closerie", "date": "2020-10-05", "presents": 16, "type": "repas"},
    {"saison": 8, "lieu": "A Conca", "date": "2020-10-19", "presents": 15, "type": "repas"},
    {"saison": 8, "lieu": "Basseta", "date": "2020-11-24", "presents": 24, "type": "repas"},
    
    # SAISON 9
    {"saison": 9, "lieu": "Goëland", "date": "2021-08-09", "presents": 17, "type": "repas"},
    {"saison": 9, "lieu": "U Baronu", "date": "2021-09-13", "presents": 18, "type": "repas"},
    {"saison": 9, "lieu": "L'Escale", "date": "2021-09-14", "presents": 17, "type": "repas"},
    {"saison": 9, "lieu": "U Baronu", "date": "2021-09-18", "presents": 20, "type": "repas"},
    {"saison": 9, "lieu": "La Closerie", "date": "2021-11-08", "presents": 24, "type": "repas"},
    {"saison": 9, "lieu": "A Conca", "date": "2021-04-22", "presents": 17, "type": "repas"},
    {"saison": 9, "lieu": "A Conca", "date": "2021-12-27", "presents": 18, "type": "repas"},
    {"saison": 9, "lieu": "Directoire", "date": "2022-01-24", "presents": 18, "type": "repas"},
    {"saison": 9, "lieu": "A Conca", "date": "2022-02-21", "presents": 15, "type": "repas"},
    {"saison": 9, "lieu": "La Closerie", "date": "2022-03-07", "presents": 17, "type": "repas"},
    {"saison": 9, "lieu": "A Conca", "date": "2022-03-28", "presents": 12, "type": "repas"},
    {"saison": 9, "lieu": "Rive Sud", "date": "2022-03-11", "presents": 15, "type": "repas"},
    {"saison": 9, "lieu": "A Conca", "date": "2022-04-25", "presents": 9, "type": "repas"},
    {"saison": 9, "lieu": "DOLCE VITA", "date": "2022-05-01", "presents": 23, "type": "repas"},
    
    # SAISON 10
    {"saison": 10, "lieu": "Bistrot Bonaparte", "date": "2022-06-27", "presents": 17, "type": "repas"},
    {"saison": 10, "lieu": "Auberge Du Prunelli", "date": "2022-07-25", "presents": 13, "type": "repas"},
    {"saison": 10, "lieu": "Jean Jean", "date": "2022-08-23", "presents": 18, "type": "repas"},
    {"saison": 10, "lieu": "L'Alba", "date": "2022-09-19", "presents": 16, "type": "repas"},
    {"saison": 10, "lieu": "A Calata", "date": "2022-10-06", "presents": 19, "type": "repas"},
    {"saison": 10, "lieu": "Escale", "date": "2022-10-24", "presents": 19, "type": "repas"},
    {"saison": 10, "lieu": "A Conca", "date": "2022-11-07", "presents": 12, "type": "repas"},
    {"saison": 10, "lieu": "La Closerie", "date": "2022-11-21", "presents": 19, "type": "repas"},
    {"saison": 10, "lieu": "St Georges", "date": "2022-12-01", "presents": 16, "type": "repas"},
    {"saison": 10, "lieu": "A Conca", "date": "2023-01-23", "presents": 16, "type": "repas"},
    {"saison": 10, "lieu": "Bistro Bonaparte", "date": "2023-01-06", "presents": 17, "type": "repas"},
    {"saison": 10, "lieu": "A Conca", "date": "2023-02-27", "presents": 18, "type": "repas"},
    {"saison": 10, "lieu": "Chez Mani", "date": "2023-03-20", "presents": 14, "type": "repas"},
    {"saison": 10, "lieu": "PALAIS DES CONGRÈS", "date": "2023-04-22", "presents": 30, "type": "anniversaire"},
    
    # SAISON 11
    {"saison": 11, "lieu": "Rendez Vous", "date": "2023-05-20", "presents": 14, "type": "repas"},
    {"saison": 11, "lieu": "A Conca", "date": "2023-06-12", "presents": 14, "type": "repas"},
    {"saison": 11, "lieu": "Goëland", "date": "2023-06-26", "presents": 18, "type": "repas"},
    {"saison": 11, "lieu": "Jean Jean", "date": "2023-07-25", "presents": 20, "type": "repas"},
    {"saison": 11, "lieu": "L'Auberge du Prunelli", "date": "2023-08-31", "presents": 16, "type": "repas"},
    {"saison": 11, "lieu": "A Conca", "date": "2023-09-04", "presents": 13, "type": "repas"},
    {"saison": 11, "lieu": "Les Halles", "date": "2023-09-18", "presents": 16, "type": "repas"},
    {"saison": 11, "lieu": "A Conca", "date": "2023-10-02", "presents": 11, "type": "repas"},
    {"saison": 11, "lieu": "A Conca", "date": "2023-10-16", "presents": 16, "type": "repas"},
    {"saison": 11, "lieu": "Directoire", "date": "2023-10-30", "presents": 11, "type": "repas"},
    {"saison": 11, "lieu": "Closerie", "date": "2023-11-12", "presents": 20, "type": "repas"},
    {"saison": 11, "lieu": "St Georges", "date": "2023-12-18", "presents": 29, "type": "repas"},
    {"saison": 11, "lieu": "A Conca", "date": "2024-01-08", "presents": 10, "type": "repas"},
    {"saison": 11, "lieu": "La Grande Brasserie", "date": "2024-01-22", "presents": 23, "type": "repas"},
    {"saison": 11, "lieu": "A Conca", "date": "2024-02-05", "presents": 10, "type": "repas"},
    
    # SAISON 12
    {"saison": 12, "lieu": "Pavillon Général", "date": "2024-06-07", "presents": 22, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2024-06-10", "presents": 11, "type": "repas"},
    {"saison": 12, "lieu": "Jean Jean", "date": "2024-08-19", "presents": 17, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2024-09-09", "presents": 15, "type": "repas"},
    {"saison": 12, "lieu": "Directoire", "date": "2024-09-23", "presents": 19, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2024-10-07", "presents": 8, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2024-11-04", "presents": 10, "type": "repas"},
    {"saison": 12, "lieu": "Vent d'Ange", "date": "2024-11-18", "presents": 20, "type": "repas"},
    {"saison": 12, "lieu": "St Georges", "date": "2024-12-16", "presents": 29, "type": "repas"},
    {"saison": 12, "lieu": "Maison Bonaparte", "date": "2025-01-20", "presents": 18, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2025-02-03", "presents": 12, "type": "repas"},
    {"saison": 12, "lieu": "Café de Flore", "date": "2025-02-17", "presents": 24, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2025-03-04", "presents": 12, "type": "repas"},
    {"saison": 12, "lieu": "TDO", "date": "2025-03-15", "presents": 18, "type": "repas"},
    {"saison": 12, "lieu": "Les Halles", "date": "2025-03-24", "presents": 18, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2025-03-31", "presents": 8, "type": "repas"},
    {"saison": 12, "lieu": "Côté Plage", "date": "2025-04-14", "presents": 18, "type": "repas"},
    {"saison": 12, "lieu": "A Conca", "date": "2025-04-28", "presents": 10, "type": "repas"},
    {"saison": 12, "lieu": "Les Halles", "date": "2025-05-12", "presents": 20, "type": "repas"},
    {"saison": 12, "lieu": "St Antoine", "date": "2025-06-14", "presents": 33, "type": "repas"},
]

async def import_all_saisons():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["test_database"]
    
    # Supprimer saisons 2-12
    result = await db.evenements.delete_many({"saison": {"$gte": 2, "$lte": 12}})
    print(f"✅ {result.deleted_count} événements supprimés (saisons 2-12)")
    
    # Importer
    count = 0
    for evt_data in EVENTS_SAISONS_2_12:
        evt = {
            "id": str(uuid.uuid4()),
            "date": datetime.fromisoformat(evt_data["date"]).isoformat(),
            "objet": evt_data["lieu"],
            "lieu": evt_data["lieu"],
            "type_sondage": evt_data["type"],
            "statut": "terminé",
            "saison": evt_data["saison"],
            "options_sondage": None,
            "total_presents": evt_data["presents"],
            "created_at": datetime.now().isoformat()
        }
        await db.evenements.insert_one(evt)
        count += 1
    
    print(f"✅ {count} événements importés (saisons 2-12)")
    
    # Stats
    print("\n📊 Statistiques par saison :")
    for s in range(1, 13):
        nb = await db.evenements.count_documents({"saison": s})
        if nb > 0:
            # Calculer total présents
            pipeline = [
                {"$match": {"saison": s}},
                {"$group": {"_id": None, "total": {"$sum": "$total_presents"}}}
            ]
            result = await db.evenements.aggregate(pipeline).to_list(1)
            total_presents = result[0]["total"] if result else 0
            print(f"  Saison {s}: {nb} événements, {total_presents} présents au total")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_all_saisons())

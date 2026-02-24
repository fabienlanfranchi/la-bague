#!/usr/bin/env python3
"""Import complet de la Saison 1 avec tous les détails"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid

MONGO_URL = "mongodb://localhost:27017"

# Saison 1 - Tous les événements avec détails complets
SAISON_1 = [
    {
        "lieu": "Allegria",
        "date": "2013-04-18",
        "type": "repas",
        "presents": ["Fabien", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Mathias", "Jean Jacques", "Paul henry", "Xavier", "Ange joseph", "Chacha", "Roger"],
        "total": 13
    },
    {
        "lieu": "Chez Miko",
        "date": "2013-05-07",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Mathias", "Jean Jacques", "Jean Luc", "Paul Rossion", "Paul henry", "Franck Paoli", "Roger", "Fx Buresi", "Pascal"],
        "total": 16
    },
    {
        "lieu": "Côté Plage",
        "date": "2013-06-24",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Hervé", "Jean Simon", "Jean Luc", "Ceccè", "Jean Ange Leca", "Toinou", "Fx Buresi", "Benoît Barnoin", "Paul Rossion", "Antonio", "Ange joseph", "Joseph A", "Chacha"],
        "total": 21
    },
    {
        "lieu": "Bergerie",
        "date": "2013-07-15",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Fx Polverelli", "Ludo Leca", "Joseph A", "Roger", "Toinou", "Benoît Barnoin", "Paul Rossion", "Charly"],
        "total": 16
    },
    {
        "lieu": "Jean Jean",
        "date": "2013-08-19",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Mathias", "Nini", "Jean Luc", "Thomas", "Ludo Leca", "Jean Ange Leca", "Toinou", "Antonio", "Ange joseph", "Paul Rossion", "Benoît Barnoin", "Charly"],
        "total": 15
    },
    {
        "lieu": "Restaurant",
        "date": "2013-09-19",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Hervé", "Jean Jacques", "Pascal", "Paul Rossion", "François Cardi", "Chacha", "Joseph A", "Jean Ange Leca"],
        "total": 15
    },
    {
        "lieu": "St Georges",
        "date": "2013-10-28",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Ludo Leca", "Jean Jacques", "Ceccè", "Hervé", "Jean Simon", "Olivier Fabbri", "Jean Ange Leca", "François Cardi", "Roger", "Joseph A", "Fx Buresi", "Paul Rossion", "Chacha"],
        "total": 23
    },
    {
        "lieu": "Roi de Rome",
        "date": "2013-11-18",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Jean Jacques", "Toussaint", "Ludo Leca", "Ceccè", "Jean Ange Leca", "Toinou", "Olivier Fabbri", "Pascal", "Joseph A", "Fx Buresi"],
        "total": 17
    },
    {
        "lieu": "Bel Messere",
        "date": "2013-12-23",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Jeff", "Paul henry", "Ludo Leca", "Jean Ange Leca", "François Cardi", "Olivier Fabbri", "Joseph A", "Fx Buresi", "Paul Rossion", "Ludo Leca", "Toinou"],
        "total": 18
    },
    {
        "lieu": "Rive Sud",
        "date": "2014-01-28",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Mathias", "Jean Jacques", "Ange joseph", "Ceccè", "Joseph A", "Fx Buresi", "Olivier Fabbri", "Jean Ange Leca"],
        "total": 15
    },
    {
        "lieu": "St Georges",
        "date": "2014-02-15",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Mathias", "Jean Jacques", "Paul henry", "Ceccè", "Ludo Leca", "François Cardi", "Toinou", "Paul Rossion", "Fx Polverelli", "Jean Ange Leca", "Charly"],
        "total": 20
    },
    {
        "lieu": "Bistrot d'Emile",
        "date": "2014-03-15",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Mathias", "Jean Jacques", "Jean Luc", "Paul henry", "Fx Polverelli", "Ludo Leca", "Jean Ange Leca", "Toinou", "Fx Buresi", "Pascal", "Paul Rossion", "Olivier Fabbri", "Ange joseph", "Joseph A", "Charly"],
        "total": 20
    },
    {
        "lieu": "Chemin des Vignobles",
        "date": "2014-04-15",
        "type": "repas",
        "presents": ["Fabien", "Ambroise", "Jacques", "Nini", "Ange phi", "Jeff", "Thomas", "Mathias", "Jean Jacques", "Jean Luc", "Paul henry", "Fx Polverelli", "Ludo Leca", "Jean Ange Leca", "Toinou", "Fx Buresi", "Pascal", "Paul Rossion", "Olivier Fabbri", "Ange joseph", "Joseph A", "Charly"],
        "total": 24
    }
]

async def import_saison_1():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["test_database"]
    
    # Supprimer les événements de la Saison 1 existants
    result = await db.evenements.delete_many({"saison": 1})
    print(f"✅ {result.deleted_count} événements Saison 1 supprimés")
    
    # Importer les nouveaux événements
    count = 0
    for evt_data in SAISON_1:
        # Nettoyer la liste des présents (enlever les doublons)
        presents_clean = list(dict.fromkeys(evt_data["presents"]))  # Garde l'ordre, enlève doublons
        
        evt = {
            "id": str(uuid.uuid4()),
            "date": datetime.fromisoformat(evt_data["date"]).isoformat(),
            "objet": f"{evt_data['lieu']} - {evt_data['total']} présents",
            "lieu": evt_data["lieu"],
            "type_sondage": evt_data["type"],
            "statut": "terminé",
            "saison": 1,
            "options_sondage": None,
            "presents": presents_clean,  # Liste des membres présents
            "total_presents": evt_data["total"],
            "created_at": datetime.now().isoformat()
        }
        await db.evenements.insert_one(evt)
        count += 1
    
    print(f"✅ {count} événements Saison 1 importés avec détails complets")
    
    # Afficher un exemple
    exemple = await db.evenements.find_one({"saison": 1})
    if exemple:
        print(f"\n📋 Exemple - {exemple['lieu']} :")
        print(f"   Date: {exemple['date']}")
        print(f"   Type: {exemple['type_sondage']}")
        print(f"   Présents: {len(exemple.get('presents', []))} membres")
        print(f"   Total: {exemple['total_presents']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_saison_1())

"""
Restaurer l'événement "Anniversaire Café de la Plage" du 13 juin 2026 (Saison 13)
avec les 27 présents (membres) identifiés par l'utilisateur.

- Crée l'événement (type_sondage=anniversaire, statut=terminé)
- Incrémente saisons_config.nb_anniversaires (S13)
- Ajoute 27 reponses_manuelles (type=membre_manuel)
- Ajoute 27 reponses_sondages (compatibilité historique)
- Incrémente presences_membres.presences_anniversaires pour chacun (+1)
- presences_log pour éviter double comptage
"""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

PRESENT_NUMEROS = [1, 3, 4, 5, 6, 8, 9, 18, 23, 24, 47, 48, 49, 51, 53, 54, 55, 58, 62, 64, 66, 67, 68, 69, 71, 73, 74]

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now = datetime.now(timezone.utc).isoformat()

    # 1) Vérifier que l'event n'existe pas déjà (idempotent)
    existing = await db.evenements.find_one({
        "saison": 13,
        "type_sondage": "anniversaire",
        "lieu": "Café de la Plage"
    })
    if existing:
        print(f"⚠️  Événement existe déjà: id={existing['id']}")
        client.close()
        return

    # 2) Créer l'événement
    evt_id = str(uuid.uuid4())
    evt_doc = {
        "id": evt_id,
        "date": "2026-06-13T19:00:00+00:00",
        "objet": "Anniversaire",
        "lieu": "Café de la Plage",
        "type_sondage": "anniversaire",
        "statut": "terminé",
        "saison": 13,
        "options_sondage": None,
        "created_at": now,
        "total_presents": len(PRESENT_NUMEROS),
        "detail": "Dernier événement de la saison 13 - Anniversaire du club"
    }
    await db.evenements.insert_one(evt_doc)
    print(f"✅ Événement créé id={evt_id}")

    # 3) Incrémenter saisons_config.nb_anniversaires
    s13_cfg = await db.saisons_config.find_one({"saison": 13})
    if s13_cfg:
        await db.saisons_config.update_one(
            {"saison": 13},
            {"$inc": {"nb_anniversaires": 1}, "$set": {"updated_at": now}}
        )
    else:
        await db.saisons_config.insert_one({
            "id": str(uuid.uuid4()), "saison": 13,
            "nb_aperos": 0, "nb_repas": 0, "nb_anniversaires": 1,
            "created_at": now, "updated_at": now
        })
    print("✅ saisons_config S13 nb_anniversaires +1")

    # 4) Pour chaque membre présent, ajouter reponse_manuelle + reponse_sondage + presences_membres + log
    members = await db.members.find({"numero_membre": {"$in": PRESENT_NUMEROS}}, {"_id": 0}).to_list(100)
    if len(members) != len(PRESENT_NUMEROS):
        found = {m["numero_membre"] for m in members}
        missing = [n for n in PRESENT_NUMEROS if n not in found]
        print(f"⚠️  Membres introuvables: {missing}")
        client.close()
        return

    for m in members:
        mid = m["id"]
        nom = m["nom_complet"]
        # reponse_manuelle
        await db.reponses_manuelles.insert_one({
            "id": str(uuid.uuid4()),
            "evenement_id": evt_id,
            "membre_id": mid,
            "nom": nom,
            "type": "membre_manuel",
            "present": True,
            "choix_entree": None, "choix_plat": None, "choix_dessert": None,
            "created_at": now
        })
        # reponse_sondage
        await db.reponses_sondages.insert_one({
            "id": str(uuid.uuid4()),
            "evenement_id": evt_id,
            "membre_id": mid,
            "present": True,
            "choix_entree": None, "choix_plat": None, "choix_dessert": None,
            "repondu_le": now,
            "ajout_manuel": True
        })
        # presences_membres.presences_anniversaires +=1
        existing_p = await db.presences_membres.find_one({"membre_id": mid, "saison": 13})
        if existing_p:
            await db.presences_membres.update_one(
                {"membre_id": mid, "saison": 13},
                {"$inc": {"presences_anniversaires": 1}, "$set": {"updated_at": now}}
            )
        else:
            await db.presences_membres.insert_one({
                "id": str(uuid.uuid4()),
                "membre_id": mid,
                "saison": 13,
                "presences_aperos": 0,
                "presences_repas": 0,
                "presences_anniversaires": 1,
                "created_at": now, "updated_at": now
            })
        # presences_log
        await db.presences_log.insert_one({
            "evenement_id": evt_id,
            "membre_id": mid,
            "type_field": "presences_anniversaires",
            "saison": 13,
            "created_at": now
        })

    print(f"✅ {len(members)} membres marqués présents")

    # 5) Verif
    cfg = await db.saisons_config.find_one({"saison": 13}, {"_id": 0})
    print(f"\nConfig S13 finale: aperos={cfg.get('nb_aperos')}, repas={cfg.get('nb_repas')}, anniversaires={cfg.get('nb_anniversaires')}")
    total_ann = await db.presences_membres.aggregate([
        {"$match": {"saison": 13}},
        {"$group": {"_id": None, "tot": {"$sum": "$presences_anniversaires"}}}
    ]).to_list(1)
    print(f"Sum presences_anniversaires S13 = {total_ann[0]['tot'] if total_ann else 0}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())

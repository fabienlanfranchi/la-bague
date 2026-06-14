"""
Sauvegarde + restauration des présences de Fabien Lanfranchi
selon les chiffres confirmés par l'utilisateur:
  S12 = 100% (8/8 apéros, 11/11 repas, 1/1 anniversaire)
  S13 = 1 apéro loupé / 0 repas loupé (6/7 apéros, 10/10 repas, 1/1 anniversaire)
"""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1) BACKUP COMPLET des présences AVANT toute action
    all_pres = await db.presences_membres.find({}, {"_id": 0}).to_list(2000)
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id,
        "backup_date": now_iso,
        "reason": "manual_pre_restore_fabien_14_06_2026",
        "snapshot": all_pres
    })
    print(f"✅ BACKUP id={backup_id} ({len(all_pres)} entrées sauvegardées)")
    
    # 2) Restaurer Fabien
    fab = await db.members.find_one({"nom_complet": {"$regex": "Fabien"}}, {"_id": 0, "id": 1})
    fid = fab["id"]
    
    # S12: 8 apéros, 11 repas, 1 anniversaire (100%)
    await db.presences_membres.update_one(
        {"membre_id": fid, "saison": 12},
        {"$set": {
            "presences_aperos": 8,
            "presences_repas": 11,
            "presences_anniversaires": 1,
            "updated_at": now_iso,
            "manually_corrected_14_06_2026": True
        }},
        upsert=True
    )
    print(f"✅ Fabien S12 -> 8/11/1 (100%)")
    
    # S13: 6 apéros, 10 repas, 1 anniversaire (1 apéro loupé, 0 repas loupé)
    await db.presences_membres.update_one(
        {"membre_id": fid, "saison": 13},
        {"$set": {
            "presences_aperos": 6,
            "presences_repas": 10,
            "presences_anniversaires": 1,
            "updated_at": now_iso,
            "manually_corrected_14_06_2026": True
        }},
        upsert=True
    )
    print(f"✅ Fabien S13 -> 6/10/1 (94%)")
    
    # 3) Vérification
    p12 = await db.presences_membres.find_one({"membre_id": fid, "saison": 12}, {"_id": 0})
    p13 = await db.presences_membres.find_one({"membre_id": fid, "saison": 13}, {"_id": 0})
    print(f"\nS12 final: ap={p12['presences_aperos']} rp={p12['presences_repas']} an={p12['presences_anniversaires']}")
    print(f"S13 final: ap={p13['presences_aperos']} rp={p13['presences_repas']} an={p13['presences_anniversaires']}")
    
    client.close()

asyncio.run(main())

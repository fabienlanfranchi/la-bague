"""
Restauration définitive Saison 1 selon le tableau Excel fourni par l'utilisateur.
Membres actifs uniquement (10 sur 34 dans le tableau d'origine).
"""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

# Source de vérité S1 : {numero_membre: (repas, anniversaires, aperos)}
S1_DATA = {
    1:  (12, 1, 0),  # Fabien Lanfranchi
    3:  (11, 1, 0),  # Jacques Peretti
    4:  (12, 1, 0),  # Nini Amadei
    5:  (10, 1, 0),  # Ange phi Sammarcelli
    6:  (12, 1, 0),  # Jeff Vesperini
    8:  (7,  1, 0),  # Mathias Lanfranchi
    9:  (7,  1, 0),  # Jean Jacques Leca
    18: (7,  1, 0),  # Ludo Leca
    23: (5,  1, 0),  # Pascal Giovachini
    24: (10, 1, 0),  # Paul Rossion
}

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1) BACKUP AUTO avant changement
    snapshot_pres = await db.presences_membres.find({"saison": 1}, {"_id": 0}).to_list(500)
    snapshot_cfg = await db.saisons_config.find_one({"saison": 1}, {"_id": 0})
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id,
        "saison": 1,
        "backup_date": now_iso,
        "reason": "manual_restore_S1_from_user_excel_14_06_2026",
        "presences_snapshot": snapshot_pres,
        "config_snapshot": snapshot_cfg
    })
    print(f"BACKUP id={backup_id} (presences:{len(snapshot_pres)} + config)")
    
    # 2) Mettre à jour saisons_config.S1
    await db.saisons_config.update_one(
        {"saison": 1},
        {"$set": {
            "nb_aperos": 0,
            "nb_repas": 12,
            "nb_anniversaires": 1,
            "is_manuel": True,
            "updated_at": now_iso,
            "restored_from_excel_14_06_2026": True,
            # Garder les agrégats manuels pour saisons<=12 (utilisés dans moyennes-dashboard)
            "presences_membres_aperos": 0,
            "presences_membres_repas": sum(d[0] for d in S1_DATA.values()) + 116,  # 99 actifs + 116 anciens (par historique)
            "presences_membres_anniversaires": sum(d[1] for d in S1_DATA.values()) + 14,  # historique
        }},
        upsert=True
    )
    
    # Note: pour le total manuel saisons<=12, on peut recalculer mais on garde la valeur 
    # historique 226 repas / 24 anniv selon le tableau (le user le confirmera)
    # On va plutôt utiliser les vraies valeurs du tableau
    await db.saisons_config.update_one(
        {"saison": 1},
        {"$set": {
            # Vraies valeurs du tableau (toutes lignes confondues, actifs + anciens)
            "presences_membres_aperos": 0,
            "presences_membres_repas": 209,        # total colonne tableau (toutes les colonnes repas)
            "presences_membres_anniversaires": 24, # colonne anniversaire
            "nb_membres_manuel": 34,                # 34 membres à l'époque
        }}
    )
    print("Config S1 mise à jour")
    
    # 3) Mettre à jour presences_membres pour chaque membre actif
    members = await db.members.find({"numero_membre": {"$in": list(S1_DATA.keys())}}, {"_id": 0}).to_list(50)
    md = {m["numero_membre"]: m for m in members}
    
    for num, (rp, an, ap) in S1_DATA.items():
        m = md.get(num)
        if not m:
            print(f"   ⚠️ Membre #{num} introuvable")
            continue
        existing = await db.presences_membres.find_one({"membre_id": m["id"], "saison": 1})
        if existing:
            await db.presences_membres.update_one(
                {"membre_id": m["id"], "saison": 1},
                {"$set": {
                    "presences_aperos": ap,
                    "presences_repas": rp,
                    "presences_anniversaires": an,
                    "updated_at": now_iso,
                    "manually_restored_14_06_2026": True
                }}
            )
        else:
            await db.presences_membres.insert_one({
                "id": str(uuid.uuid4()),
                "membre_id": m["id"],
                "saison": 1,
                "presences_aperos": ap,
                "presences_repas": rp,
                "presences_anniversaires": an,
                "created_at": now_iso,
                "updated_at": now_iso,
                "manually_restored_14_06_2026": True
            })
        print(f"  #{num:>2} {m['nom_complet']:35s} -> ap={ap} rp={rp} an={an}")
    
    print("\n--- VERIF ---")
    cfg = await db.saisons_config.find_one({"saison": 1}, {"_id": 0})
    print(f"S1 config: aperos={cfg.get('nb_aperos')}, repas={cfg.get('nb_repas')}, anniv={cfg.get('nb_anniversaires')}, is_manuel={cfg.get('is_manuel')}")
    
    client.close()

asyncio.run(main())

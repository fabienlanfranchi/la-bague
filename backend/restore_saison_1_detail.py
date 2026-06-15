"""
Restauration DÉTAILLÉE Saison 1 par événement.
Source : tableau Excel utilisateur (case 1 = présent).
Crée les reponses_manuelles (type=membre_manuel) pour chaque (membre actif, event présent).
Met à jour total_presents de chaque event.
"""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

# Matrice de présence S1 — 10 membres actifs × 13 événements
# Ordre colonnes : Allegria, Chez Miko, Côté Plage, Bergerie, Jean Jean, Restaurant,
#                  St Georges Oct, Roi de Rome, Bel Messere, Rive Sud, St Georges Fév,
#                  Bistrot d'Emile, Chemin des Vignobles (anniv)
S1_MATRIX = {
    1:  [1,1,1,1,1,1,1,1,1,1,1,1,1],  # Fabien
    3:  [1,1,1,1,0,1,1,1,1,1,1,1,1],  # Jacques
    4:  [1,1,1,1,1,1,1,1,1,1,1,1,1],  # Nini
    5:  [1,1,1,1,0,1,1,1,1,0,1,1,1],  # Ange phi
    6:  [1,1,1,1,1,1,1,1,1,1,1,1,1],  # Jeff
    8:  [1,1,0,0,1,0,1,0,1,0,1,1,1],  # Mathias
    9:  [1,1,0,0,0,1,1,0,1,0,1,1,1],  # Jean Jacques L.
    18: [0,0,0,1,1,0,0,1,1,1,1,1,1],  # Ludo
    23: [0,0,1,0,0,1,0,1,0,1,0,1,1],  # Pascal Giovachini
    24: [0,1,1,1,1,1,1,0,1,1,1,1,1],  # Paul Rossion
}

# Ordre des events S1 (par date) — doit matcher l'ordre des colonnes du tableau
S1_EVENT_ORDER = [
    ("Allegria",          "2013-04-18"),
    ("Chez Miko",         "2013-05-07"),
    ("Côte Plage",        "2013-06-24"),
    ("Bergerie",          "2013-07-15"),
    ("Jean Jean",         "2013-08-19"),
    ("Le Restaurant",     "2013-09-19"),
    ("St Georges",        "2013-10-28"),
    ("Roi de Rome",       "2013-11-18"),
    ("Bel Messere",       "2013-12-23"),
    ("Rive Sud",          "2014-01-28"),
    ("St Georges",        "2014-02-15"),
    ("Bistrot d'Emile",   "2014-03-15"),
    ("Chemin des Vignobles", "2014-04-15"),  # anniversaire
]

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1) Récupérer les events S1 et les indexer par (lieu, date)
    evts = await db.evenements.find({"saison": 1}, {"_id": 0}).to_list(50)
    evt_map = {}
    for e in evts:
        key = (e["lieu"], e["date"][:10])
        evt_map[key] = e
    
    # Mapping ordre tableau -> event_id
    ordered_events = []
    for lieu, date in S1_EVENT_ORDER:
        e = evt_map.get((lieu, date))
        if not e:
            print(f"⚠️  Event introuvable: {lieu} - {date}")
            return
        ordered_events.append(e)
    print(f"✅ 13 events S1 trouvés et ordonnés")
    
    # 2) Backup des reponses_manuelles existantes pour S1
    s1_evt_ids = [e["id"] for e in ordered_events]
    existing_rm = await db.reponses_manuelles.find({"evenement_id": {"$in": s1_evt_ids}}, {"_id": 0}).to_list(1000)
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id,
        "saison": 1,
        "backup_date": now_iso,
        "reason": "manual_restore_S1_DETAIL_per_event_14_06_2026",
        "reponses_manuelles_snapshot": existing_rm,
        "events_ids": s1_evt_ids
    })
    print(f"✅ BACKUP id={backup_id} ({len(existing_rm)} reponses_manuelles existantes)")
    
    # 3) Récupérer les membres actifs concernés
    members = await db.members.find({"numero_membre": {"$in": list(S1_MATRIX.keys())}}, {"_id": 0}).to_list(50)
    md = {m["numero_membre"]: m for m in members}
    
    # 4) Pour chaque event, supprimer les anciennes reponses_manuelles des membres actifs concernés
    #    puis recréer selon la matrice
    member_ids = [m["id"] for m in members]
    deleted_count = 0
    for evt in ordered_events:
        r = await db.reponses_manuelles.delete_many({
            "evenement_id": evt["id"],
            "membre_id": {"$in": member_ids}
        })
        deleted_count += r.deleted_count
    print(f"🗑️  {deleted_count} reponses_manuelles obsolètes supprimées (membres actifs S1 uniquement)")
    
    # 5) Créer les nouvelles reponses_manuelles + maj total_presents
    total_created = 0
    for col_idx, evt in enumerate(ordered_events):
        present_for_evt = 0
        for num, row in S1_MATRIX.items():
            if row[col_idx] != 1:
                continue
            m = md.get(num)
            if not m:
                continue
            await db.reponses_manuelles.insert_one({
                "id": str(uuid.uuid4()),
                "evenement_id": evt["id"],
                "membre_id": m["id"],
                "nom": m["nom_complet"],
                "type": "membre_manuel",
                "present": True,
                "choix_entree": None, "choix_plat": None, "choix_dessert": None,
                "created_at": now_iso,
                "restored_from_excel_14_06_2026": True
            })
            total_created += 1
            present_for_evt += 1
        
        # Mettre à jour total_presents de l'event (compté sur la base de TOUS les présents, pas juste les actifs)
        # Pour S1, on ne connait que les actifs. Le total_presents reste tel quel ou est mis à present_for_evt si > current
        current_total = evt.get("total_presents", 0) or 0
        new_total = max(current_total, present_for_evt)
        await db.evenements.update_one(
            {"id": evt["id"]},
            {"$set": {"total_presents": new_total, "statut": "terminé", "type_sondage": evt["type_sondage"]}}
        )
        print(f"  Event {evt['lieu'][:25]:<27} ({evt['date'][:10]}) : {present_for_evt} membres actifs présents")
    
    print(f"\n✅ {total_created} reponses_manuelles créées pour la Saison 1")
    
    client.close()

asyncio.run(main())

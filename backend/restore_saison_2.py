"""
Restauration complète Saison 2 selon le tableau Excel.
- 18 events (6 apéros + 11 repas + 1 anniversaire)
- 11 membres actifs en S2
- Totaux globaux 63 apéros / 192 repas / 30 anniv (avec anciens + honneur)
"""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

# Ordre des colonnes du tableau Excel S2 (18 events)
S2_EVENT_ORDER = [
    # (lieu, type, date_iso)
    ("San Carlu",          "repas",        "2014-05-15"),  # 1
    ("Casabianca",         "repas",        "2014-06-15"),  # 2
    ("Jean Jean",          "repas",        "2014-07-15"),  # 3
    ("Roc 72",             "repas",        "2014-08-15"),  # 4
    ("Bistrot d'Emile",    "repas",        "2014-09-15"),  # 5
    ("A Conca",            "apero",        "2014-09-15"),  # 6
    ("Rive Sud",           "repas",        "2014-10-20"),  # 7
    ("Albert 1er",         "apero",        "2014-11-04"),  # 8
    ("Roi de Rome",        "repas",        "2014-11-17"),  # 9
    ("Comptoir",           "apero",        "2014-12-01"),  # 10
    ("Bel Messere",        "repas",        "2014-12-15"),  # 11
    ("St Georges",         "repas",        "2015-01-19"),  # 12
    ("A Conca",            "apero",        "2015-02-02"),  # 13
    ("Roi de Rome",        "repas",        "2015-02-16"),  # 14
    ("Albert 1er",         "apero",        "2015-03-02"),  # 15
    ("Palm Beach",         "repas",        "2015-03-16"),  # 16
    ("Comptoir",           "apero",        "2015-03-31"),  # 17
    ("Palais des congrès", "anniversaire", "2015-04-25"),  # 18
]

# Matrice de présence des 11 membres actifs S2 - 18 colonnes
S2_MATRIX = {
    1:  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  # Fabien
    3:  [1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1],  # Jacques
    4:  [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1],  # Nini
    5:  [0,1,1,0,1,1,0,1,1,0,1,1,1,1,0,1,0,1],  # Ange phi
    6:  [1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1],  # Jeff
    8:  [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],  # Mathias
    9:  [1,1,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],  # Jean Jacques
    18: [1,1,1,1,0,1,0,0,1,1,1,1,0,0,1,0,1,1],  # Ludo
    23: [1,1,1,1,1,0,0,1,0,0,1,1,0,1,0,0,0,1],  # Pascal
    24: [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1],  # Paul Rossion
    37: [1,1,1,0,1,0,0,0,0,1,1,1,0,1,0,1,0,1],  # Marc Antoine Guillot
}

# Totaux par event (du tableau Excel)
S2_TOTAL_PRESENTS = [21,20,20,17,15,10,14,14,17,11,16,21,9,13,10,18,9,25]


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1) BACKUP
    snapshot_pres = await db.presences_membres.find({"saison": 2}, {"_id": 0}).to_list(500)
    snapshot_cfg = await db.saisons_config.find_one({"saison": 2}, {"_id": 0})
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id, "saison": 2, "backup_date": now_iso,
        "reason": "manual_restore_S2_from_user_excel",
        "presences_snapshot": snapshot_pres, "config_snapshot": snapshot_cfg
    })
    print(f"✅ BACKUP id={backup_id}")
    
    # 2) Trouver les events S2 dans la base, mapping par (lieu, type, date)
    evts = await db.evenements.find({"saison": 2}, {"_id": 0}).to_list(50)
    evt_map = {(e["lieu"], e["type_sondage"], e["date"][:10]): e for e in evts}
    ordered_events = []
    for lieu, t, date in S2_EVENT_ORDER:
        e = evt_map.get((lieu, t, date))
        if not e:
            print(f"⚠️ Event introuvable: {lieu}/{t}/{date}")
            return
        ordered_events.append(e)
    print(f"✅ {len(ordered_events)} events S2 trouvés et ordonnés")
    
    # 3) Mettre à jour saisons_config.S2
    sum_active_ap = sum(sum(row[i] for i, e in enumerate(S2_EVENT_ORDER) if e[1] == "apero") for row in S2_MATRIX.values())
    sum_active_rp = sum(sum(row[i] for i, e in enumerate(S2_EVENT_ORDER) if e[1] == "repas") for row in S2_MATRIX.values())
    sum_active_an = sum(sum(row[i] for i, e in enumerate(S2_EVENT_ORDER) if e[1] == "anniversaire") for row in S2_MATRIX.values())
    print(f"Sum membres actifs (info): ap={sum_active_ap} rp={sum_active_rp} an={sum_active_an}")
    
    await db.saisons_config.update_one(
        {"saison": 2},
        {"$set": {
            "nb_aperos": 6, "nb_repas": 11, "nb_anniversaires": 1,
            "is_manuel": True,
            "presences_membres_aperos": 63,
            "presences_membres_repas": 192,
            "presences_membres_anniversaires": 30,
            "nb_membres_manuel": 35,
            "updated_at": now_iso,
            "restored_from_excel_14_06_2026": True
        }},
        upsert=True
    )
    print("✅ saisons_config S2 mis à jour")
    
    # 4) Mettre à jour presences_membres pour les 11 actifs
    members = await db.members.find({"numero_membre": {"$in": list(S2_MATRIX.keys())}}, {"_id": 0}).to_list(50)
    md = {m["numero_membre"]: m for m in members}
    
    for num, row in S2_MATRIX.items():
        m = md.get(num)
        if not m:
            print(f"⚠️ Membre #{num} introuvable")
            continue
        ap = sum(row[i] for i, e in enumerate(S2_EVENT_ORDER) if e[1] == "apero")
        rp = sum(row[i] for i, e in enumerate(S2_EVENT_ORDER) if e[1] == "repas")
        an = sum(row[i] for i, e in enumerate(S2_EVENT_ORDER) if e[1] == "anniversaire")
        await db.presences_membres.update_one(
            {"membre_id": m["id"], "saison": 2},
            {"$set": {
                "presences_aperos": ap, "presences_repas": rp, "presences_anniversaires": an,
                "updated_at": now_iso, "manually_restored_14_06_2026": True
            }},
            upsert=True
        )
        print(f"  #{num:>2} {m['nom_complet'][:30]:<32} -> ap={ap} rp={rp} an={an}")
    
    # 5) Supprimer les anciennes reponses_manuelles des actifs S2 puis recréer
    s2_evt_ids = [e["id"] for e in ordered_events]
    member_ids = [m["id"] for m in members]
    r = await db.reponses_manuelles.delete_many({
        "evenement_id": {"$in": s2_evt_ids},
        "membre_id": {"$in": member_ids}
    })
    print(f"🗑️ {r.deleted_count} reponses_manuelles anciennes supprimées")
    
    total_created = 0
    for col_idx, evt in enumerate(ordered_events):
        for num, row in S2_MATRIX.items():
            if row[col_idx] != 1:
                continue
            m = md.get(num)
            if not m:
                continue
            await db.reponses_manuelles.insert_one({
                "id": str(uuid.uuid4()), "evenement_id": evt["id"], "membre_id": m["id"],
                "nom": m["nom_complet"], "type": "membre_manuel", "present": True,
                "choix_entree": None, "choix_plat": None, "choix_dessert": None,
                "created_at": now_iso, "restored_from_excel_14_06_2026": True
            })
            total_created += 1
        # S'assurer que total_presents reflète la valeur du tableau (avec anciens)
        await db.evenements.update_one(
            {"id": evt["id"]},
            {"$set": {"total_presents": S2_TOTAL_PRESENTS[col_idx], "statut": "terminé"}}
        )
    print(f"✅ {total_created} reponses_manuelles créées")
    print("\n🎉 Saison 2 restaurée et verrouillée")
    
    client.close()

asyncio.run(main())

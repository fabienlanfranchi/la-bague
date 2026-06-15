"""
Restauration S3 depuis xlsx OFFICIEL.
Triple-check appliqué (matrice + listes par event), tout concorde.
21 events: 8 apéros + 12 repas + 1 anniversaire.
"""
import asyncio, os, uuid, json
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

with open("/tmp/s3_parsed.json") as f:
    data = json.load(f)

EVENT_HEADERS = data["event_headers"]
EVENT_TYPES = data["event_types"]
EVENT_LISTS = data["event_lists"]  # {nom_event: [nb, [presents...]]}
MATRIX_ACTIVE = {int(k): v for k, v in data["matrix_active"].items()}
ACTIVE_MAP = data["ACTIVE_MAP"]
TOTALS = data["totals"]

# Extract lieu (sans date) pour matching
def extract_lieu(nom_event):
    # Ex: "Restaurant    11 mai" -> "Restaurant"
    import re
    n = nom_event.strip()
    # Sépare avant les chiffres ou avant des mots de date
    parts = re.split(r'\s+\d|\s+(?:Mai|Juin|Juil|Juillet|Août|Sept|Septembre|Oct|Octobre|Nov|Novembre|Déc|Décembre|Janvier|janvier|Février|février|Mars|mars|Avril|avril)', n)
    return parts[0].strip()

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # BACKUP
    sp = await db.presences_membres.find({"saison": 3}, {"_id": 0}).to_list(500)
    sc = await db.saisons_config.find_one({"saison": 3}, {"_id": 0})
    se = await db.evenements.find({"saison": 3}, {"_id": 0}).to_list(100)
    rm = await db.reponses_manuelles.find({"evenement_id": {"$in": [e["id"] for e in se]}}, {"_id": 0}).to_list(2000)
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id, "saison": 3, "backup_date": now_iso,
        "reason": "manual_restore_S3_from_xlsx",
        "presences_snapshot": sp, "config_snapshot": sc,
        "events_snapshot": se, "reponses_snapshot": rm
    })
    print(f"✅ BACKUP id={backup_id}")
    
    # 1) saisons_config.S3
    await db.saisons_config.update_one(
        {"saison": 3},
        {"$set": {
            "nb_aperos": 8, "nb_repas": 12, "nb_anniversaires": 1,
            "is_manuel": True,
            "presences_membres_aperos": TOTALS["ap_pres"],
            "presences_membres_repas": TOTALS["rp_pres"],
            "presences_membres_anniversaires": TOTALS["an_pres"],
            "nb_membres_manuel": TOTALS["nb_membres"],
            "updated_at": now_iso,
            "restored_from_xlsx_15_06_2026": True
        }}
    )
    print(f"✅ saisons_config S3 -> 8 ap, 12 rp, 1 an | prés: {TOTALS['ap_pres']}/{TOTALS['rp_pres']}/{TOTALS['an_pres']}")
    
    # 2) Match events BDD avec headers xlsx (par lieu+ordre)
    base_evts = await db.evenements.find({"saison": 3}, {"_id": 0}).sort("date", 1).to_list(50)
    print(f"\nEvents en base S3: {len(base_evts)}")
    
    def normalize(s):
        return (s or "").lower().replace("'", "").replace("é", "e").replace("è", "e").replace("ê", "e").replace(" ", "").strip()
    
    # Map xlsx_header -> base_event
    base_by_lieu = {}
    for b in base_evts:
        base_by_lieu.setdefault(normalize(b["lieu"]), []).append(b)
    
    ordered_base_ids = []
    used_ids = set()
    for xh in EVENT_HEADERS:
        lieu_x = normalize(extract_lieu(xh))
        candidates = base_by_lieu.get(lieu_x, [])
        # Take first not yet used
        matched = None
        for c in candidates:
            if c["id"] not in used_ids:
                matched = c
                used_ids.add(c["id"])
                break
        ordered_base_ids.append(matched["id"] if matched else None)
        if not matched:
            print(f"  ⚠️ Pas de match BDD pour '{xh}' (lieu='{lieu_x}')")
    
    # 3) Update types + total_presents
    for i, xh in enumerate(EVENT_HEADERS):
        bid = ordered_base_ids[i]
        if not bid: continue
        t = EVENT_TYPES[i]
        nb = EVENT_LISTS[xh][0]
        await db.evenements.update_one(
            {"id": bid},
            {"$set": {"type_sondage": t, "total_presents": nb, "statut": "terminé"}}
        )
    matched_count = sum(1 for x in ordered_base_ids if x)
    print(f"✅ {matched_count}/{len(EVENT_HEADERS)} events S3 mis à jour")
    
    # 4) presences_membres pour membres actifs
    members = await db.members.find({"numero_membre": {"$in": [int(v) for v in ACTIVE_MAP.values()]}}, {"_id": 0}).to_list(50)
    md_by_num = {m["numero_membre"]: m for m in members}
    
    for num, info in MATRIX_ACTIVE.items():
        m = md_by_num.get(num)
        if not m: continue
        await db.presences_membres.update_one(
            {"membre_id": m["id"], "saison": 3},
            {"$set": {
                "presences_aperos": info["ap"], "presences_repas": info["rp"], "presences_anniversaires": info["an"],
                "updated_at": now_iso, "restored_from_xlsx_15_06_2026": True
            }},
            upsert=True
        )
        print(f"  #{num:>2} {m['nom_complet'][:30]:<32} -> {info['ap']}/{info['rp']}/{info['an']}")
    
    # 5) Recréer reponses_manuelles depuis listes
    s3_evt_ids = [bid for bid in ordered_base_ids if bid]
    active_ids = [md_by_num[v]["id"] for v in ACTIVE_MAP.values() if int(v) in md_by_num]
    r = await db.reponses_manuelles.delete_many({
        "evenement_id": {"$in": s3_evt_ids},
        "membre_id": {"$in": active_ids}
    })
    print(f"\n🗑️ {r.deleted_count} reponses_manuelles anciennes supprimées")
    
    name_to_num = {k: int(v) for k, v in ACTIVE_MAP.items()}
    total_created = 0
    for i, xh in enumerate(EVENT_HEADERS):
        bid = ordered_base_ids[i]
        if not bid: continue
        liste_present = EVENT_LISTS[xh][1]
        for nom_present in liste_present:
            nc = nom_present.strip()
            if nc not in name_to_num: continue
            m = md_by_num.get(name_to_num[nc])
            if not m: continue
            await db.reponses_manuelles.insert_one({
                "id": str(uuid.uuid4()), "evenement_id": bid, "membre_id": m["id"],
                "nom": m["nom_complet"], "type": "membre_manuel", "present": True,
                "created_at": now_iso, "restored_from_xlsx_15_06_2026": True
            })
            total_created += 1
    print(f"✅ {total_created} reponses_manuelles créées pour membres actifs S3")
    
    client.close()

asyncio.run(main())

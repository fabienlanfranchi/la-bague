"""
Restauration S2 depuis xlsx OFFICIEL.
Règle: ne JAMAIS compter Honneur/Anciens/Invités. Seulement les noms du xlsx.
"""
import asyncio, os, uuid, json
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

with open("/tmp/s2_parsed.json") as f:
    data = json.load(f)

EVENTS = data["events"]
MATRIX = {int(k): v for k, v in data["matrix"].items()}
TOTALS = data["totals"]
ACTIVE_MAP = data["ACTIVE_MAP"]

# Catégorisation
APERO_KEYWORDS = [("A Conca", "6 Sept"), ("Albert 1er", "3 Nov"), ("Comptoir", "1 dé"),
                  ("A Conca", "2 Fév"), ("Albert 1er", "2 mars"), ("Comptoir", "31 mar")]
ANNIV_KEYWORDS = [("Palais",)]
def get_type(nom):
    n = nom.lower()
    for kws in ANNIV_KEYWORDS:
        if all(kw.lower() in n for kw in kws): return "anniversaire"
    for kws in APERO_KEYWORDS:
        if all(kw.lower() in n for kw in kws): return "apero"
    return "repas"

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # BACKUP complet
    sp = await db.presences_membres.find({"saison": 2}, {"_id": 0}).to_list(500)
    sc = await db.saisons_config.find_one({"saison": 2}, {"_id": 0})
    se = await db.evenements.find({"saison": 2}, {"_id": 0}).to_list(100)
    rm = await db.reponses_manuelles.find({"evenement_id": {"$in": [e["id"] for e in se]}}, {"_id": 0}).to_list(1000)
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id, "saison": 2, "backup_date": now_iso,
        "reason": "manual_restore_S2_from_xlsx_official",
        "presences_snapshot": sp, "config_snapshot": sc,
        "events_snapshot": se, "reponses_snapshot": rm
    })
    print(f"✅ BACKUP id={backup_id}")
    
    # 1) saisons_config.S2 — règle : 25 anniv, total 280, 33 membres uniques
    await db.saisons_config.update_one(
        {"saison": 2},
        {"$set": {
            "nb_aperos": 6, "nb_repas": 11, "nb_anniversaires": 1,
            "is_manuel": True,
            "presences_membres_aperos": 63,
            "presences_membres_repas": 192,
            "presences_membres_anniversaires": 25,  # 25, pas 30 (sans honneur/anciens)
            "nb_membres_manuel": 33,                 # 33, pas 35
            "updated_at": now_iso,
            "restored_from_xlsx_15_06_2026": True
        }}
    )
    print("✅ saisons_config S2 -> 6 ap, 11 rp, 1 an | prés_total 280 | 33 membres")
    
    # 2) Mapping events DB par nom (fuzzy)
    base_evts = await db.evenements.find({"saison": 2}, {"_id": 0}).to_list(50)
    
    def normalize(s):
        return (s or "").lower().replace("'", "").replace("é", "e").replace("è", "e").replace("ê", "e").strip()
    
    # Construire mapping xlsx -> base
    ordered_base_ids = []
    base_by_lieu_date = {}
    for b in base_evts:
        lieu_n = normalize(b["lieu"])
        date_d = b["date"][:7]  # year-month for distinguishing duplicates
        base_by_lieu_date.setdefault(lieu_n, []).append(b)
    
    used_ids = set()
    for ev_x in EVENTS:
        nom_n = normalize(ev_x["nom_xlsx"])
        matched = None
        # Match: nom commence par lieu_normalized
        for lieu_n, blist in base_by_lieu_date.items():
            if nom_n.startswith(lieu_n) or lieu_n in nom_n[:len(lieu_n)+5]:
                for b in blist:
                    if b["id"] not in used_ids:
                        matched = b
                        used_ids.add(b["id"])
                        break
                if matched: break
        ordered_base_ids.append(matched["id"] if matched else None)
        if not matched:
            print(f"⚠️ Pas de match: {ev_x['nom_xlsx']}")
    
    # 3) Update type et total_presents de chaque event
    for i, ev_x in enumerate(EVENTS):
        bid = ordered_base_ids[i]
        if not bid: continue
        t = get_type(ev_x["nom_xlsx"])
        await db.evenements.update_one(
            {"id": bid},
            {"$set": {"type_sondage": t, "total_presents": ev_x["nb_attendu"], "statut": "terminé"}}
        )
    print(f"✅ {sum(1 for x in ordered_base_ids if x)} events S2 mis à jour")
    
    # 4) presences_membres pour membres actifs
    members = await db.members.find({"numero_membre": {"$in": [int(v) for v in ACTIVE_MAP.values()]}}, {"_id": 0}).to_list(50)
    md_by_num = {m["numero_membre"]: m for m in members}
    
    for num_str, info in MATRIX.items():
        num = int(num_str) if isinstance(num_str, str) else num_str
        m = md_by_num.get(num)
        if not m:
            print(f"⚠️ #{num} introuvable")
            continue
        await db.presences_membres.update_one(
            {"membre_id": m["id"], "saison": 2},
            {"$set": {
                "presences_aperos": info["ap"],
                "presences_repas": info["rp"],
                "presences_anniversaires": info["an"],
                "updated_at": now_iso,
                "restored_from_xlsx_15_06_2026": True
            }},
            upsert=True
        )
        print(f"  #{num:>2} {m['nom_complet'][:32]:<33} -> {info['ap']}/{info['rp']}/{info['an']}")
    
    # 5) Re-créer toutes les reponses_manuelles selon xlsx (uniquement actifs)
    s2_evt_ids = [bid for bid in ordered_base_ids if bid]
    active_member_ids = [md_by_num[v]["id"] for v in ACTIVE_MAP.values() if int(v) in md_by_num]
    r = await db.reponses_manuelles.delete_many({
        "evenement_id": {"$in": s2_evt_ids},
        "membre_id": {"$in": active_member_ids}
    })
    print(f"\n🗑️ {r.deleted_count} reponses_manuelles anciennes supprimées")
    
    total_created = 0
    name_to_num = {k: int(v) for k, v in ACTIVE_MAP.items()}
    for i, ev_x in enumerate(EVENTS):
        bid = ordered_base_ids[i]
        if not bid: continue
        for nom_present in ev_x["presents_noms"]:
            nom_clean = nom_present.strip()
            if nom_clean not in name_to_num:
                continue  # ancien membre, on ne crée pas de reponse_manuelle
            num = name_to_num[nom_clean]
            m = md_by_num.get(num)
            if not m: continue
            await db.reponses_manuelles.insert_one({
                "id": str(uuid.uuid4()),
                "evenement_id": bid,
                "membre_id": m["id"],
                "nom": m["nom_complet"],
                "type": "membre_manuel",
                "present": True,
                "created_at": now_iso,
                "restored_from_xlsx_15_06_2026": True
            })
            total_created += 1
    print(f"✅ {total_created} reponses_manuelles créées pour membres actifs S2")
    
    client.close()

asyncio.run(main())

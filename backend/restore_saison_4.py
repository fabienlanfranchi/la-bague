"""
Restauration S4 depuis xlsx (avec catégorisation EXPLICITE par couleur).
"""
import asyncio, os, uuid, openpyxl
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

wb = openpyxl.load_workbook("/tmp/S4.xlsx", data_only=True)

# 1) Catégories depuis "Par evenement"
ws_e = wb["Par evenement"]
EVENTS = []
for r in range(2, ws_e.max_row + 1):
    nom = ws_e.cell(row=r, column=1).value
    type_str = ws_e.cell(row=r, column=2).value
    nb = ws_e.cell(row=r, column=3).value
    liste = ws_e.cell(row=r, column=4).value
    if not nom: continue
    t_clean = (type_str or "").lower().strip()
    if "apéro" in t_clean or "apero" in t_clean: t = "apero"
    elif "anniversaire" in t_clean: t = "anniversaire"
    else: t = "repas"
    presents = [p.strip() for p in (liste or "").split(",") if p.strip()]
    EVENTS.append({"nom": nom.strip(), "type": t, "nb": nb, "presents": presents})

# 2) Par membre - totaux explicites
ws_m = wb["Par membre"]
TOTAL_PAR_MEMBRE = {}
for r in range(2, ws_m.max_row+1):
    nom = ws_m.cell(row=r, column=1).value
    if not nom: continue
    TOTAL_PAR_MEMBRE[str(nom).strip()] = {
        "total": ws_m.cell(row=r, column=2).value or 0,
        "ap": ws_m.cell(row=r, column=3).value or 0,
        "rp": ws_m.cell(row=r, column=4).value or 0,
        "an": ws_m.cell(row=r, column=5).value or 0,
    }

ACTIVE = {"Fabien":1, "Jacques":3, "Nini":4, "Ange phi":5, "Jeff":6, "Mathias":8,
          "Jean Jacques":9, "Ludo Leca":18, "Pascal":23, "Paul Rossion":24, "Marc Antoine Guillot":37}

# 3) Catégorisation
ap_events = [e for e in EVENTS if e["type"] == "apero"]
rp_events = [e for e in EVENTS if e["type"] == "repas"]
an_events = [e for e in EVENTS if e["type"] == "anniversaire"]
print(f"S4 catégorisation explicite:")
print(f"  {len(ap_events)} apéros / {len(rp_events)} repas / {len(an_events)} anniversaires (total {len(EVENTS)})")
ap_sum = sum(e["nb"] for e in ap_events)
rp_sum = sum(e["nb"] for e in rp_events)
an_sum = sum(e["nb"] for e in an_events)
print(f"  Présences: {ap_sum} ap / {rp_sum} rp / {an_sum} an = {ap_sum+rp_sum+an_sum}\n")

# 4) Triple-check membres actifs
print(f"{'#':<4}{'Nom':<25}{'xlsx ap/rp/an':<18}{'depuis_listes':<18}{'Match'}")
print("-"*80)
for name, num in ACTIVE.items():
    info = TOTAL_PAR_MEMBRE.get(name)
    if not info:
        print(f"  ⚠️ {name} pas dans 'Par membre'")
        continue
    ap_calc = sum(1 for e in EVENTS if name in [p.strip() for p in e["presents"]] and e["type"] == "apero")
    rp_calc = sum(1 for e in EVENTS if name in [p.strip() for p in e["presents"]] and e["type"] == "repas")
    an_calc = sum(1 for e in EVENTS if name in [p.strip() for p in e["presents"]] and e["type"] == "anniversaire")
    match = "✅" if (ap_calc, rp_calc, an_calc) == (info["ap"], info["rp"], info["an"]) else "⚠️"
    print(f"{num:<4}{name:<25}{info['ap']}/{info['rp']}/{info['an']}             {ap_calc}/{rp_calc}/{an_calc}             {match}")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # BACKUP
    sp = await db.presences_membres.find({"saison": 4}, {"_id": 0}).to_list(500)
    sc = await db.saisons_config.find_one({"saison": 4}, {"_id": 0})
    se = await db.evenements.find({"saison": 4}, {"_id": 0}).to_list(100)
    rm = await db.reponses_manuelles.find({"evenement_id": {"$in": [e["id"] for e in se]}}, {"_id": 0}).to_list(2000)
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id, "saison": 4, "backup_date": now_iso,
        "reason": "manual_restore_S4_from_xlsx_with_colors",
        "presences_snapshot": sp, "config_snapshot": sc,
        "events_snapshot": se, "reponses_snapshot": rm
    })
    print(f"\n✅ BACKUP id={backup_id}")
    
    # 1) saisons_config.S4
    await db.saisons_config.update_one(
        {"saison": 4},
        {"$set": {
            "nb_aperos": len(ap_events), "nb_repas": len(rp_events), "nb_anniversaires": len(an_events),
            "is_manuel": True,
            "presences_membres_aperos": ap_sum,
            "presences_membres_repas": rp_sum,
            "presences_membres_anniversaires": an_sum,
            "nb_membres_manuel": 32,
            "updated_at": now_iso,
            "restored_from_xlsx_15_06_2026": True
        }}
    )
    print(f"✅ saisons_config S4: {len(ap_events)}/{len(rp_events)}/{len(an_events)} | prés {ap_sum}/{rp_sum}/{an_sum}")
    
    # 2) Map events BDD
    base_evts = await db.evenements.find({"saison": 4}, {"_id": 0}).sort("date", 1).to_list(50)
    def normalize(s):
        return (s or "").lower().replace("'", "").replace("é", "e").replace("è", "e").replace("ê", "e").replace("à", "a").replace("ç","c").replace(" ", "").strip()
    
    def extract_lieu(nom):
        import re
        parts = re.split(r'\s+\d|\s+(?:Mai|mai|Juin|juin|Juil|Juillet|juillet|Août|août|Sept|sept|Septembre|septembre|Oct|oct|Octobre|octobre|Nov|nov|Novembre|novembre|Déc|déc|Décembre|décembre|Janvier|janvier|Février|février|Mars|mars|Avril|avril)', nom)
        return parts[0].strip()
    
    base_by_lieu = {}
    for b in base_evts:
        base_by_lieu.setdefault(normalize(b["lieu"]), []).append(b)
    
    used_ids = set()
    matched_count = 0
    unmatched = []
    for ev_x in EVENTS:
        lieu_x = normalize(extract_lieu(ev_x["nom"]))
        candidates = base_by_lieu.get(lieu_x, [])
        bid = None
        for c in candidates:
            if c["id"] not in used_ids:
                bid = c["id"]
                used_ids.add(bid)
                break
        if bid:
            await db.evenements.update_one(
                {"id": bid},
                {"$set": {"type_sondage": ev_x["type"], "total_presents": ev_x["nb"], "statut": "terminé"}}
            )
            ev_x["bid"] = bid
            matched_count += 1
        else:
            unmatched.append(ev_x["nom"])
    print(f"✅ {matched_count}/{len(EVENTS)} events matchés")
    if unmatched:
        print(f"⚠️ Non matchés: {unmatched}")
    
    # 3) presences_membres pour actifs
    members = await db.members.find({"numero_membre": {"$in": list(ACTIVE.values())}}, {"_id": 0}).to_list(50)
    md = {m["numero_membre"]: m for m in members}
    for name, num in ACTIVE.items():
        info = TOTAL_PAR_MEMBRE.get(name)
        if not info: continue
        m = md.get(num)
        if not m: continue
        await db.presences_membres.update_one(
            {"membre_id": m["id"], "saison": 4},
            {"$set": {
                "presences_aperos": info["ap"], "presences_repas": info["rp"],
                "presences_anniversaires": info["an"], "updated_at": now_iso,
                "restored_from_xlsx_15_06_2026": True
            }},
            upsert=True
        )
    print(f"✅ presences_membres mis à jour pour {len(ACTIVE)} actifs")
    
    # 4) Recréer reponses_manuelles
    s4_evt_ids = [ev.get("bid") for ev in EVENTS if ev.get("bid")]
    active_ids = [md[v]["id"] for v in ACTIVE.values() if v in md]
    r = await db.reponses_manuelles.delete_many({
        "evenement_id": {"$in": s4_evt_ids},
        "membre_id": {"$in": active_ids}
    })
    print(f"🗑️ {r.deleted_count} reponses_manuelles supprimées")
    
    total_c = 0
    for ev_x in EVENTS:
        if not ev_x.get("bid"): continue
        for nom_p in ev_x["presents"]:
            n = nom_p.strip()
            if n in ACTIVE:
                m = md.get(ACTIVE[n])
                if m:
                    await db.reponses_manuelles.insert_one({
                        "id": str(uuid.uuid4()), "evenement_id": ev_x["bid"], "membre_id": m["id"],
                        "nom": m["nom_complet"], "type": "membre_manuel", "present": True,
                        "created_at": now_iso
                    })
                    total_c += 1
    print(f"✅ {total_c} reponses_manuelles créées")
    
    client.close()

asyncio.run(main())

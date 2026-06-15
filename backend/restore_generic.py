"""
Script générique de restauration depuis xlsx (format Saison_X_..._Classification_Couleurs).
Usage: python restore_generic.py <saison_num> <xlsx_path>
"""
import asyncio, os, sys, uuid, openpyxl
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

SAISON = int(sys.argv[1])
XLSX_PATH = sys.argv[2]

ACTIVE = {"Fabien":1, "Jacques":3, "Nini":4, "Ange phi":5, "Jeff":6, "Mathias":8,
          "Jean Jacques":9, "Ludo Leca":18, "Pascal":23, "Paul Rossion":24, "Marc Antoine Guillot":37}

wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)

# Events
ws_e = wb["Par evenement"]
EVENTS = []
for r in range(2, ws_e.max_row+1):
    nom = ws_e.cell(row=r, column=1).value
    t_str = ws_e.cell(row=r, column=2).value
    nb = ws_e.cell(row=r, column=3).value
    liste = ws_e.cell(row=r, column=4).value
    if not nom: continue
    tl = (t_str or "").lower().strip()
    if "apéro" in tl or "apero" in tl: t = "apero"
    elif "anniversaire" in tl: t = "anniversaire"
    else: t = "repas"
    EVENTS.append({"nom": nom.strip(), "type": t, "nb": nb,
                   "presents": [p.strip() for p in (liste or "").split(",") if p.strip()]})

ap_events = [e for e in EVENTS if e["type"] == "apero"]
rp_events = [e for e in EVENTS if e["type"] == "repas"]
an_events = [e for e in EVENTS if e["type"] == "anniversaire"]
ap_sum = sum(e["nb"] for e in ap_events)
rp_sum = sum(e["nb"] for e in rp_events)
an_sum = sum(e["nb"] for e in an_events)

# Par membre
ws_m = wb["Par membre"]
TOTAL_PAR_MEMBRE = {}
for r in range(2, ws_m.max_row+1):
    nom = ws_m.cell(row=r, column=1).value
    if not nom: continue
    TOTAL_PAR_MEMBRE[str(nom).strip()] = {
        "ap": ws_m.cell(row=r, column=3).value or 0,
        "rp": ws_m.cell(row=r, column=4).value or 0,
        "an": ws_m.cell(row=r, column=5).value or 0,
    }

# Synthese pour nb_membres
ws_s = wb["Synthese"]
nb_membres = 33
for r in range(1, ws_s.max_row+1):
    a = ws_s.cell(row=r, column=1).value
    if a and "membres" in str(a).lower():
        v = ws_s.cell(row=r, column=2).value
        if v: nb_membres = int(v)

print(f"\n=== xlsx S{SAISON} ===")
print(f"  {len(ap_events)} apéros ({ap_sum}) / {len(rp_events)} repas ({rp_sum}) / {len(an_events)} anniv ({an_sum})")
print(f"  Total: {len(EVENTS)} events / {ap_sum+rp_sum+an_sum} présences / {nb_membres} membres")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # DIFF
    old_cfg = await db.saisons_config.find_one({"saison": SAISON}, {"_id": 0}) or {}
    members = await db.members.find({"numero_membre": {"$in": list(ACTIVE.values())}}, {"_id": 0}).to_list(50)
    md = {m["numero_membre"]: m for m in members}
    old_pres = {}
    for num, m in md.items():
        p = await db.presences_membres.find_one({"membre_id": m["id"], "saison": SAISON}, {"_id": 0})
        old_pres[num] = (p.get("presences_aperos",0) if p else 0, p.get("presences_repas",0) if p else 0, p.get("presences_anniversaires",0) if p else 0)
    
    print(f"\n=== DIFF CONFIG ===")
    print(f"{'Critère':<25}{'AVANT':<10}{'APRÈS':<10}{'Δ'}")
    for k, label in [("nb_aperos","nb_aperos"),("nb_repas","nb_repas"),("nb_anniversaires","nb_anniv"),
                     ("presences_membres_aperos","prés_aperos"),("presences_membres_repas","prés_repas"),
                     ("presences_membres_anniversaires","prés_anniv")]:
        a = old_cfg.get(k, 0) or 0
        if k == "nb_aperos": b = len(ap_events)
        elif k == "nb_repas": b = len(rp_events)
        elif k == "nb_anniversaires": b = len(an_events)
        elif k == "presences_membres_aperos": b = ap_sum
        elif k == "presences_membres_repas": b = rp_sum
        elif k == "presences_membres_anniversaires": b = an_sum
        print(f"  {label:<23}{a:<10}{b:<10}{b-a:+d}")
    
    print(f"\n=== DIFF MEMBRES ACTIFS ===")
    print(f"{'#':<4}{'Nom':<22}{'AVANT':<14}{'APRÈS':<14}{'Δ'}")
    for name, num in ACTIVE.items():
        info = TOTAL_PAR_MEMBRE.get(name)
        if not info: continue
        oap, orp, oan = old_pres[num]
        nap, nrp, nan = info["ap"], info["rp"], info["an"]
        dtot = (nap+nrp+nan) - (oap+orp+oan)
        flag = '✅' if dtot == 0 else f'{dtot:+d}'
        print(f"  {num:<4}{name:<22}{oap}/{orp}/{oan}         {nap}/{nrp}/{nan}         {flag}")
    
    # BACKUP avant écriture
    sp = await db.presences_membres.find({"saison": SAISON}, {"_id": 0}).to_list(500)
    se = await db.evenements.find({"saison": SAISON}, {"_id": 0}).to_list(100)
    rm = await db.reponses_manuelles.find({"evenement_id": {"$in": [e["id"] for e in se]}}, {"_id": 0}).to_list(2000)
    backup_id = str(uuid.uuid4())
    await db.presences_membres_backup.insert_one({
        "id": backup_id, "saison": SAISON, "backup_date": now_iso,
        "reason": f"manual_restore_S{SAISON}_from_xlsx_colors",
        "presences_snapshot": sp, "config_snapshot": old_cfg,
        "events_snapshot": se, "reponses_snapshot": rm
    })
    print(f"\n✅ BACKUP id={backup_id}")
    
    # Écrire config
    await db.saisons_config.update_one(
        {"saison": SAISON},
        {"$set": {
            "nb_aperos": len(ap_events), "nb_repas": len(rp_events), "nb_anniversaires": len(an_events),
            "is_manuel": True, "presences_membres_aperos": ap_sum,
            "presences_membres_repas": rp_sum, "presences_membres_anniversaires": an_sum,
            "nb_membres_manuel": nb_membres, "updated_at": now_iso,
            "restored_from_xlsx_15_06_2026": True
        }}
    )
    
    # Map events BDD par lieu+date
    base_evts = await db.evenements.find({"saison": SAISON}, {"_id": 0}).sort("date", 1).to_list(50)
    def normalize(s):
        return (s or "").lower().replace("'", "").replace("é", "e").replace("è", "e").replace("ê", "e").replace("à", "a").replace("ç","c").replace("ô","o").replace(".","").replace(" ", "").strip()
    def extract_lieu(nom):
        import re
        parts = re.split(r'\s+\d|\s+(?:Mai|mai|Juin|juin|Juil|Juillet|juillet|Août|août|Sept|sept|Septembre|septembre|Oct|oct|Octobre|octobre|Nov|nov|Novembre|novembre|Déc|déc|Décembre|décembre|Janvier|janvier|Janv|janv|Février|février|Fevr|Mars|mars|Avril|avril)', nom)
        return parts[0].strip()
    
    base_by_lieu = {}
    for b in base_evts:
        base_by_lieu.setdefault(normalize(b["lieu"]), []).append(b)
    
    used = set()
    unmatched = []
    for ev_x in EVENTS:
        lieu_x = normalize(extract_lieu(ev_x["nom"]))
        bid = None
        # Try exact normalize match
        for c in base_by_lieu.get(lieu_x, []):
            if c["id"] not in used:
                bid = c["id"]; used.add(bid); break
        # Try prefix/contains match
        if not bid:
            for lieu_base, candidates in base_by_lieu.items():
                if (lieu_x in lieu_base or lieu_base in lieu_x) and abs(len(lieu_x)-len(lieu_base)) < 5:
                    for c in candidates:
                        if c["id"] not in used:
                            bid = c["id"]; used.add(bid); break
                    if bid: break
        if bid:
            await db.evenements.update_one(
                {"id": bid},
                {"$set": {"type_sondage": ev_x["type"], "total_presents": ev_x["nb"], "statut": "terminé"}}
            )
            ev_x["bid"] = bid
        else:
            unmatched.append(ev_x["nom"])
    
    matched = sum(1 for e in EVENTS if e.get("bid"))
    print(f"✅ {matched}/{len(EVENTS)} events matchés")
    if unmatched:
        print(f"⚠️ Non matchés: {unmatched}")
    
    # presences_membres
    for name, num in ACTIVE.items():
        info = TOTAL_PAR_MEMBRE.get(name)
        if not info: continue
        m = md.get(num)
        if not m: continue
        await db.presences_membres.update_one(
            {"membre_id": m["id"], "saison": SAISON},
            {"$set": {"presences_aperos": info["ap"], "presences_repas": info["rp"],
                      "presences_anniversaires": info["an"], "updated_at": now_iso,
                      "restored_from_xlsx_15_06_2026": True}},
            upsert=True
        )
    
    # reponses_manuelles
    s_evt_ids = [e["bid"] for e in EVENTS if e.get("bid")]
    active_ids = [md[v]["id"] for v in ACTIVE.values() if v in md]
    r = await db.reponses_manuelles.delete_many({"evenement_id": {"$in": s_evt_ids}, "membre_id": {"$in": active_ids}})
    
    created = 0
    for ev_x in EVENTS:
        if not ev_x.get("bid"): continue
        for nom in ev_x["presents"]:
            n = nom.strip()
            if n in ACTIVE:
                m = md.get(ACTIVE[n])
                if m:
                    await db.reponses_manuelles.insert_one({
                        "id": str(uuid.uuid4()), "evenement_id": ev_x["bid"], "membre_id": m["id"],
                        "nom": m["nom_complet"], "type": "membre_manuel", "present": True,
                        "created_at": now_iso
                    })
                    created += 1
    print(f"✅ reponses_manuelles: {r.deleted_count} supprimées, {created} créées")
    
    # Si unmatched: tenter par index séquentiel
    if unmatched:
        print(f"\n⚠️ Events non matchés à corriger manuellement: {unmatched}")
    
    client.close()

asyncio.run(main())

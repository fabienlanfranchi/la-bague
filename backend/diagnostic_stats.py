"""
Diagnostic READ-ONLY pour identifier le bug des statistiques de présence Saison 13.
Vérifie : événements créés, configs saisons, présences membres, cohérence des compteurs.
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("="*80)
    print("DIAGNOSTIC STATS PRESENCES - LA BAGUE IMPERIALE")
    print("="*80)

    # 1) Saisons configs
    print("\n--- 1. Configs de saisons (saisons_config) ---")
    configs = await db.saisons_config.find({}, {"_id": 0}).to_list(100)
    configs.sort(key=lambda c: c.get("saison", 0))
    for c in configs:
        print(f"  Saison {c.get('saison')}: aperos={c.get('nb_aperos',0)}, "
              f"repas={c.get('nb_repas',0)}, anniversaires={c.get('nb_anniversaires',0)}")

    # 2) Liste des événements saison 13 (groupés par type)
    print("\n--- 2. Événements Saison 13 (evenements) ---")
    evts_s13 = await db.evenements.find({"saison": 13}, {"_id": 0}).to_list(500)
    by_type = {}
    for e in evts_s13:
        t = (e.get("type_sondage") or "").lower().replace("é", "e")
        by_type.setdefault(t, []).append(e)
    for t, lst in by_type.items():
        print(f"  Type '{t}' (count={len(lst)}):")
        for e in lst:
            print(f"     - id={e.get('id')[:8]}.. titre='{e.get('titre')}' "
                  f"date={e.get('date')} statut={e.get('statut')} "
                  f"saison={e.get('saison')}")
    print(f"  TOTAL événements S13 = {len(evts_s13)}")

    # 3) Vérifier réponses pour anniversaire
    print("\n--- 3. Présences à l'événement Anniversaire Café de la Plage ---")
    for e in evts_s13:
        titre = (e.get("titre") or "").lower()
        if "anniversaire" in titre or "anniversaire" in (e.get("type_sondage") or "").lower():
            evt_id = e.get("id")
            print(f"\n  >> Event '{e.get('titre')}' (id={evt_id})")
            print(f"     type_sondage={e.get('type_sondage')} | statut={e.get('statut')}")
            # reponses_sondages
            rs = await db.reponses_sondages.find({"evenement_id": evt_id}).to_list(500)
            present_count = sum(1 for r in rs if r.get("present") is True)
            print(f"     reponses_sondages: total={len(rs)}, présents={present_count}")
            # reponses_manuelles
            rm = await db.reponses_manuelles.find({"evenement_id": evt_id}).to_list(500)
            print(f"     reponses_manuelles: total={len(rm)}")
            for r in rm[:5]:
                print(f"       -> type={r.get('type')} nom='{r.get('nom')}' "
                      f"membre_id={r.get('membre_id')} present={r.get('present')}")
            # presences_log pour cet event
            pl = await db.presences_log.find({"evenement_id": evt_id}).to_list(500)
            print(f"     presences_log: total entries = {len(pl)}")

    # 4) Total presences_membres pour saison 13 sommées par type
    print("\n--- 4. Sommes presences_membres pour S13 (sanity check) ---")
    pms_s13 = await db.presences_membres.find({"saison": 13}, {"_id": 0}).to_list(500)
    total_aperos = sum(p.get("presences_aperos", 0) for p in pms_s13)
    total_repas = sum(p.get("presences_repas", 0) for p in pms_s13)
    total_ann = sum(p.get("presences_anniversaires", 0) for p in pms_s13)
    print(f"  presences_membres S13: entries={len(pms_s13)}")
    print(f"  Sum presences_aperos = {total_aperos}")
    print(f"  Sum presences_repas  = {total_repas}")
    print(f"  Sum presences_anniversaires = {total_ann}")

    # 5) Cohérence: événements terminés vs config
    print("\n--- 5. Vérification cohérence Config vs Événements réels (S13) ---")
    cfg13 = next((c for c in configs if c.get("saison") == 13), None)
    if cfg13:
        print(f"  Config S13 dit: aperos={cfg13.get('nb_aperos',0)}, "
              f"repas={cfg13.get('nb_repas',0)}, anniversaires={cfg13.get('nb_anniversaires',0)}")
        # Compter événements par type
        by_type_count = {"apero": 0, "repas": 0, "anniversaire": 0}
        by_type_finished = {"apero": 0, "repas": 0, "anniversaire": 0}
        for e in evts_s13:
            t = (e.get("type_sondage") or "").lower().replace("é", "e")
            if t in by_type_count:
                by_type_count[t] += 1
                if e.get("statut") in ("termine", "terminé", "termine_envoye"):
                    by_type_finished[t] += 1
        print(f"  Événements réels S13: {by_type_count}")
        print(f"  Événements terminés S13: {by_type_finished}")

    # 6) Stats par membre pour S13 (anciens membres + champ pourcentage)
    print("\n--- 6. Top membres avec présences S13 ---")
    members = await db.members.find({}, {"_id": 0, "id":1, "nom_complet":1, "annee_entree":1,
                                          "saisons_exclues":1, "pourcentage_presences":1}).to_list(500)
    members_dict = {m["id"]: m for m in members}
    rows = []
    for p in pms_s13:
        m = members_dict.get(p["membre_id"], {})
        rows.append({
            "nom": m.get("nom_complet", "?"),
            "aperos": p.get("presences_aperos", 0),
            "repas": p.get("presences_repas", 0),
            "ann": p.get("presences_anniversaires", 0),
            "total": p.get("presences_aperos", 0) + p.get("presences_repas", 0) + p.get("presences_anniversaires", 0)
        })
    rows.sort(key=lambda r: -r["total"])
    for r in rows[:15]:
        print(f"  {r['nom']:35s} aperos={r['aperos']:2d} repas={r['repas']:2d} ann={r['ann']:2d} -> tot={r['total']}")

    # 7) Voir le détail Fabien Lanfranchi (labague1, le président)
    print("\n--- 7. DETAIL Fabien Lanfranchi (Président) ---")
    fabien = await db.members.find_one({"nom_complet": {"$regex": "Fabien", "$options": "i"}}, {"_id": 0})
    if fabien:
        fid = fabien["id"]
        print(f"  id={fid} annee_entree={fabien.get('annee_entree')} saisons_exclues={fabien.get('saisons_exclues')}")
        all_p_fabien = await db.presences_membres.find({"membre_id": fid}, {"_id": 0}).sort("saison", 1).to_list(100)
        for p in all_p_fabien:
            print(f"    Saison {p.get('saison')}: aperos={p.get('presences_aperos',0)} "
                  f"repas={p.get('presences_repas',0)} ann={p.get('presences_anniversaires',0)}")
        # Calcul manuel comme dans get_members
        configs_dict = {c["saison"]: c for c in configs}
        annee_entree = fabien.get("annee_entree", 2013)
        premiere_saison = annee_entree - 2012
        saisons_exclues = set(fabien.get("saisons_exclues", []))
        total_p = 0
        total_e = 0
        for p in all_p_fabien:
            s = p["saison"]
            if s < premiere_saison or s in saisons_exclues:
                continue
            cfg = configs_dict.get(s, {})
            total_p += p.get("presences_aperos",0) + p.get("presences_repas",0) + p.get("presences_anniversaires",0)
            total_e += cfg.get("nb_aperos",0) + cfg.get("nb_repas",0) + cfg.get("nb_anniversaires",0)
        # Ajouter saisons sans presences mais après entree
        for saison, cfg in configs_dict.items():
            if saison >= premiere_saison and saison not in saisons_exclues:
                already = any(p["saison"] == saison for p in all_p_fabien if p["saison"] >= premiere_saison and p["saison"] not in saisons_exclues)
                if not already:
                    total_e += cfg.get("nb_aperos",0) + cfg.get("nb_repas",0) + cfg.get("nb_anniversaires",0)
        pct = round(total_p/total_e*100) if total_e else 0
        print(f"  >> CALCUL get_members: total_presences={total_p}, total_events={total_e}, pct={pct}%")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())

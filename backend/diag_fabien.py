"""
DIAGNOSTIC: Pour Fabien Lanfranchi, lister tous les events S12/S13 et indiquer
quelle réponse il a (ou pas).
"""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    fab = await db.members.find_one({"nom_complet": {"$regex": "Fabien"}}, {"_id": 0, "id": 1, "nom_complet": 1})
    fid = fab["id"]
    print(f"Membre: {fab['nom_complet']} (id={fid})\n")

    for saison in [12, 13]:
        print(f"========== SAISON {saison} ==========")
        evts = await db.evenements.find({"saison": saison}, {"_id": 0}).sort("date", 1).to_list(100)
        for e in evts:
            eid = e["id"]
            t = (e.get("type_sondage") or "").lower().replace("é", "e")
            date_s = str(e.get("date", ""))[:10]
            lieu = e.get("lieu", "?")
            # Check reponses_sondages
            rs = await db.reponses_sondages.find_one({"evenement_id": eid, "membre_id": fid})
            rm = await db.reponses_manuelles.find_one({"evenement_id": eid, "membre_id": fid})
            status = "?"
            if rs:
                status = f"sondage:{'PRES' if rs.get('present') else 'ABS'}"
                if rs.get("ajout_manuel"):
                    status += "/manuel"
            if rm:
                status += f" + manuelle:{'PRES' if rm.get('present') else 'ABS'}({rm.get('type')})"
            if not rs and not rm:
                status = "AUCUNE REPONSE"
            print(f"  [{t:>12}] {date_s} {lieu:<35} -> {status}")
        # Récap presences_membres
        p = await db.presences_membres.find_one({"membre_id": fid, "saison": saison}, {"_id": 0})
        if p:
            print(f"\n  presences_membres: aperos={p.get('presences_aperos',0)} repas={p.get('presences_repas',0)} ann={p.get('presences_anniversaires',0)}")
        config = await db.saisons_config.find_one({"saison": saison})
        print(f"  config: nb_aperos={config.get('nb_aperos',0)} nb_repas={config.get('nb_repas',0)} nb_anniversaires={config.get('nb_anniversaires',0)}")
        # Compter events réels
        ev_ap = sum(1 for e in evts if (e.get("type_sondage") or "").lower().replace("é","e") == "apero")
        ev_rp = sum(1 for e in evts if (e.get("type_sondage") or "").lower().replace("é","e") == "repas")
        ev_an = sum(1 for e in evts if (e.get("type_sondage") or "").lower().replace("é","e") == "anniversaire")
        print(f"  events RÉELS S{saison}: apero={ev_ap} repas={ev_rp} ann={ev_an}\n")

    client.close()

asyncio.run(main())

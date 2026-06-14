"""
Audit complet READ-ONLY de TOUTES les saisons.
Vérifie cohérence entre saisons_config et presences_membres pour chaque saison.
"""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    configs = await db.saisons_config.find({}, {"_id": 0}).sort("saison", 1).to_list(100)
    members = await db.members.find({}, {"_id": 0}).to_list(100)
    all_pres = await db.presences_membres.find({}, {"_id": 0}).to_list(10000)
    events = await db.evenements.find({}, {"_id": 0}).to_list(2000)

    # Group presences by saison
    pres_by_saison = {}
    for p in all_pres:
        pres_by_saison.setdefault(p["saison"], []).append(p)

    # Group events by saison
    evt_by_saison = {}
    for e in events:
        evt_by_saison.setdefault(e.get("saison"), []).append(e)

    print(f"{'Saison':<8}{'Conf.Ap':<10}{'Conf.Rp':<10}{'Conf.An':<10}{'Sum.Ap':<10}{'Sum.Rp':<10}{'Sum.An':<10}{'Manuel':<8}{'Evt.Ap':<8}{'Evt.Rp':<8}{'Evt.An':<8}")
    print("-"*130)
    for c in configs:
        s = c["saison"]
        ps = pres_by_saison.get(s, [])
        evs = evt_by_saison.get(s, [])
        sum_ap = sum(p.get("presences_aperos", 0) for p in ps)
        sum_rp = sum(p.get("presences_repas", 0) for p in ps)
        sum_an = sum(p.get("presences_anniversaires", 0) for p in ps)
        # Manual aggregates if present
        is_manuel = c.get("is_manuel", False)
        m_ap = c.get("presences_membres_aperos", "—")
        m_rp = c.get("presences_membres_repas", "—")
        m_an = c.get("presences_membres_anniversaires", "—")
        ev_ap = sum(1 for e in evs if (e.get("type_sondage") or "").lower().replace("é","e") == "apero")
        ev_rp = sum(1 for e in evs if (e.get("type_sondage") or "").lower().replace("é","e") == "repas")
        ev_an = sum(1 for e in evs if (e.get("type_sondage") or "").lower().replace("é","e") == "anniversaire")
        print(f"S{s:<7}{c.get('nb_aperos',0):<10}{c.get('nb_repas',0):<10}{c.get('nb_anniversaires',0):<10}{sum_ap:<10}{sum_rp:<10}{sum_an:<10}{('M' if is_manuel else '-'):<8}{ev_ap:<8}{ev_rp:<8}{ev_an:<8}")

    print()
    print("=== Détail config S12 (manuel?) ===")
    s12 = next((c for c in configs if c["saison"] == 12), None)
    if s12:
        for k, v in sorted(s12.items()):
            print(f"  {k} = {v}")
    print()
    print("=== Détail config S11 ===")
    s11 = next((c for c in configs if c["saison"] == 11), None)
    if s11:
        for k, v in sorted(s11.items()):
            print(f"  {k} = {v}")
    print()
    print("=== Détail config S13 ===")
    s13 = next((c for c in configs if c["saison"] == 13), None)
    if s13:
        for k, v in sorted(s13.items()):
            print(f"  {k} = {v}")

    client.close()

asyncio.run(main())

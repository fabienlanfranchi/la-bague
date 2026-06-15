"""
Analyse Saison 2 depuis le xlsx officiel.
Reconstruit la matrice de présence à partir des listes par événement.
Triple-check: Appli BDD / Excel image / xlsx.
"""
import asyncio, os, uuid, openpyxl
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

# 1. Charger le xlsx S2
wb = openpyxl.load_workbook("/tmp/S2.xlsx", data_only=True)
synth = wb["Synthese"]
NB_EVENTS = synth.cell(row=1, column=2).value
NB_MEMBRES = synth.cell(row=2, column=2).value

# 2. Events S2 (ordre + nb présents + liste)
ev_sheet = wb["Par evenement"]
EVENTS = []
for r in range(2, ev_sheet.max_row + 1):
    nom = ev_sheet.cell(row=r, column=1).value
    nb = ev_sheet.cell(row=r, column=2).value
    liste_str = ev_sheet.cell(row=r, column=3).value
    if not nom:
        break
    presents = [p.strip() for p in (liste_str or "").split(",") if p.strip()]
    EVENTS.append({"nom_xlsx": nom.strip(), "nb_attendu": nb, "presents_noms": presents})

# 3. Présences par membre (total)
pm_sheet = wb["Par membre"]
TOTAL_PAR_MEMBRE = {}
for r in range(2, pm_sheet.max_row + 1):
    nom = pm_sheet.cell(row=r, column=1).value
    val = pm_sheet.cell(row=r, column=2).value
    if nom and isinstance(val, (int, float)):
        TOTAL_PAR_MEMBRE[str(nom).strip()] = int(val)

# 4. Types des events (catégorisation déjà validée S2)
# Apéros: A Conca 6 Sept, Albert 1er 3 Nov, Comptoir 1 Déc, A Conca 2 Fév, Albert 1er 2 Mars, Comptoir 31 Mars
# Anniversaire: Palais des congrès
APERO_KEYWORDS = [("A Conca", "6 Sept"), ("Albert 1er", "3 Nov"), ("Comptoir", "1 dé"),
                  ("A Conca", "2 Fév"), ("Albert 1er", "2 mars"), ("Comptoir", "31 mar")]
ANNIV_KEYWORDS = [("Palais",)]

def get_event_type(nom):
    n_low = nom.lower()
    for kws in ANNIV_KEYWORDS:
        if all(kw.lower() in n_low for kw in kws):
            return "anniversaire"
    for kws in APERO_KEYWORDS:
        if all(kw.lower() in n_low for kw in kws):
            return "apero"
    return "repas"

print(f"=== SYNTHÈSE xlsx S2 ===")
print(f"  Events totaux: {NB_EVENTS}")
print(f"  Membres uniques (xlsx): {NB_MEMBRES}")
print(f"  Membres avec présences enregistrées: {len(TOTAL_PAR_MEMBRE)}")

ap_count = sum(1 for e in EVENTS if get_event_type(e["nom_xlsx"]) == "apero")
rp_count = sum(1 for e in EVENTS if get_event_type(e["nom_xlsx"]) == "repas")
an_count = sum(1 for e in EVENTS if get_event_type(e["nom_xlsx"]) == "anniversaire")
ap_sum = sum(e["nb_attendu"] for e in EVENTS if get_event_type(e["nom_xlsx"]) == "apero")
rp_sum = sum(e["nb_attendu"] for e in EVENTS if get_event_type(e["nom_xlsx"]) == "repas")
an_sum = sum(e["nb_attendu"] for e in EVENTS if get_event_type(e["nom_xlsx"]) == "anniversaire")
total_pres = ap_sum + rp_sum + an_sum
print(f"\nCatégorisation déduite (à valider):")
print(f"  Apéros: {ap_count} events, {ap_sum} présences")
print(f"  Repas:  {rp_count} events, {rp_sum} présences")
print(f"  Anniv:  {an_count} events, {an_sum} présences")
print(f"  TOTAL:  {ap_count + rp_count + an_count} events, {total_pres} présences\n")

# 5. Mapping xlsx -> n° actif
ACTIVE_MAP = {
    "Fabien": 1, "Jacques": 3, "Nini": 4, "Ange phi": 5, "Jeff": 6,
    "Mathias": 8, "Jean Jacques": 9, "Ludo Leca": 18, "Pascal": 23,
    "Paul Rossion": 24, "Marc Antoine Guillot": 37
}

# 6. Calculer matrice par membre actif
def member_in_list(name, liste):
    n_low = name.lower().strip()
    return any(p.lower().strip() == n_low for p in liste)

print("=" * 95)
print(f"{'#':<4}{'Membre xlsx':<22}{'Apéros (/6)':<14}{'Repas (/11)':<14}{'Anniv (/1)':<13}{'Total':<8}{'xlsx total'}")
print("=" * 95)

MATRIX_ACTIVE = {}  # num -> {"ap": X, "rp": X, "an": X, "list_present_events": [...]}
for xlsx_name, num in ACTIVE_MAP.items():
    ap = rp = an = 0
    present_events = []
    for e in EVENTS:
        if member_in_list(xlsx_name, e["presents_noms"]):
            t = get_event_type(e["nom_xlsx"])
            present_events.append((e["nom_xlsx"], t))
            if t == "apero": ap += 1
            elif t == "repas": rp += 1
            elif t == "anniversaire": an += 1
    total = ap + rp + an
    xlsx_total = TOTAL_PAR_MEMBRE.get(xlsx_name, 0)
    flag = "✅" if total == xlsx_total else f"⚠️ Δ={total - xlsx_total:+d}"
    MATRIX_ACTIVE[num] = {"name": xlsx_name, "ap": ap, "rp": rp, "an": an, "events": present_events}
    print(f"{num:<4}{xlsx_name:<22}{ap:<14}{rp:<14}{an:<13}{total:<8}{xlsx_total} {flag}")

# 7. Verification du total des présences global
sum_active = sum(m["ap"] + m["rp"] + m["an"] for m in MATRIX_ACTIVE.values())
print(f"\nSomme présences membres actifs: {sum_active}")
print(f"Somme totale présences xlsx (avec anciens): {total_pres}")

# Sauvegarder pour script d'écriture
import json
with open("/tmp/s2_parsed.json", "w") as f:
    json.dump({
        "events": EVENTS,
        "matrix": {str(k): v for k, v in MATRIX_ACTIVE.items()},
        "totals": {"ap_count": ap_count, "rp_count": rp_count, "an_count": an_count,
                   "ap_sum": ap_sum, "rp_sum": rp_sum, "an_sum": an_sum, "total": total_pres,
                   "nb_membres": NB_MEMBRES, "nb_events": NB_EVENTS},
        "TOTAL_PAR_MEMBRE": TOTAL_PAR_MEMBRE,
        "ACTIVE_MAP": ACTIVE_MAP
    }, f, ensure_ascii=False, indent=2, default=str)
print("\n✅ Données parsées sauvegardées dans /tmp/s2_parsed.json")

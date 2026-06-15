"""
Parse S3 et triple-check: matrice + listes + base BDD actuelle.
"""
import openpyxl, json

wb = openpyxl.load_workbook("/tmp/S3.xlsx", data_only=True)

# Matrice
ws = wb["Matrice"]
event_headers = [str(ws.cell(row=1, column=c).value).strip() for c in range(3, 24)]  # 21 events
# Last col (24) is footer "Nombre de présences /21"

# Catégorisation pour S3 (les noms suivent les patterns S2)
APERO_NAMES = ["A Conca", "Comptoir", "Albert 1er"]  # patterns d'apéros
ANNIV_NAMES = ["Palais"]

def get_type(nom):
    n = nom.lower()
    for kw in ANNIV_NAMES:
        if kw.lower() in n: return "anniversaire"
    for kw in APERO_NAMES:
        if kw.lower() in n: return "apero"
    return "repas"

event_types = [get_type(h) for h in event_headers]

# Stats globales
ap_count = sum(1 for t in event_types if t == "apero")
rp_count = sum(1 for t in event_types if t == "repas")
an_count = sum(1 for t in event_types if t == "anniversaire")
print(f"Types déduits: {ap_count} apéros / {rp_count} repas / {an_count} anniversaires (total {ap_count+rp_count+an_count})")
for i, (h, t) in enumerate(zip(event_headers, event_types)):
    print(f"  {i+1:2d}. [{t:>13}] {h}")

# Lire la matrice
ACTIVE = {"Fabien":1, "Jacques":3, "Nini":4, "Ange phi":5, "Jeff":6, "Mathias":8,
          "Jean Jacques":9, "Ludo Leca":18, "Pascal":23, "Paul Rossion":24, "Marc Antoine Guillot":37}

matrix_by_name = {}
total_by_name = {}
for r in range(2, ws.max_row + 1):
    nom = ws.cell(row=r, column=1).value
    total_xlsx = ws.cell(row=r, column=2).value
    if not nom or "présences" in str(nom).lower(): continue
    presences = []
    for c in range(3, 24):
        v = ws.cell(row=r, column=c).value
        presences.append(int(v or 0))
    matrix_by_name[str(nom).strip()] = presences
    total_by_name[str(nom).strip()] = total_xlsx

# Comparaison avec listes par event
ws2 = wb["Par evenement"]
event_lists = {}
for r in range(2, ws2.max_row + 1):
    nom = ws2.cell(row=r, column=1).value
    nb = ws2.cell(row=r, column=2).value
    liste = ws2.cell(row=r, column=3).value
    if not nom or "présences" in str(nom).lower(): continue
    presents = [p.strip() for p in (liste or "").split(",") if p.strip()]
    event_lists[str(nom).strip()] = (nb, presents)

# Verify matrix vs lists match
print("\n=== TRIPLE-CHECK Matrice vs Listes (par event) ===")
all_match = True
for i, h in enumerate(event_headers):
    n_matrix = sum(presences[i] for name, presences in matrix_by_name.items())
    n_list_data = event_lists.get(h.strip())
    if n_list_data:
        n_list = n_list_data[0]
        flag = "✅" if n_matrix == n_list else f"⚠️ Matrice={n_matrix} Liste={n_list}"
        if n_matrix != n_list: all_match = False
        print(f"  {h[:40]:<42} M={n_matrix:>3} L={n_list:>3} {flag}")
print(f"\n{'✅ Matrice et listes concordent parfaitement' if all_match else '⚠️ Décalages détectés'}")

# Présences par membre actif
print(f"\n=== Présences MEMBRES ACTIFS S3 ===")
print(f"{'#':<4}{'Membre':<22}{'Apéros':<10}{'Repas':<10}{'Anniv':<10}{'Total':<8}{'xlsx total'}")
print("-"*80)

MATRIX_ACTIVE = {}
for name, num in ACTIVE.items():
    if name not in matrix_by_name:
        print(f"  ⚠️ {name} pas dans matrice")
        continue
    presences = matrix_by_name[name]
    ap = sum(p for p, t in zip(presences, event_types) if t == "apero")
    rp = sum(p for p, t in zip(presences, event_types) if t == "repas")
    an = sum(p for p, t in zip(presences, event_types) if t == "anniversaire")
    total = ap + rp + an
    xl_total = total_by_name[name]
    flag = "✅" if total == xl_total else f"Δ={total-xl_total}"
    MATRIX_ACTIVE[num] = {"name": name, "ap": ap, "rp": rp, "an": an}
    print(f"{num:<4}{name:<22}{ap:<10}{rp:<10}{an:<10}{total:<8}{xl_total} {flag}")

# Stats globales
print(f"\n=== STATS GLOBALES (sans honneur/anciens, basé sur xlsx) ===")
total_ap_pres = sum(event_lists[h.strip()][0] for h, t in zip(event_headers, event_types) if t == "apero" and h.strip() in event_lists)
total_rp_pres = sum(event_lists[h.strip()][0] for h, t in zip(event_headers, event_types) if t == "repas" and h.strip() in event_lists)
total_an_pres = sum(event_lists[h.strip()][0] for h, t in zip(event_headers, event_types) if t == "anniversaire" and h.strip() in event_lists)
print(f"  Apéros: {ap_count} events / {total_ap_pres} présences")
print(f"  Repas:  {rp_count} events / {total_rp_pres} présences")
print(f"  Anniv:  {an_count} events / {total_an_pres} présences")
print(f"  TOTAL:  {ap_count+rp_count+an_count} events / {total_ap_pres+total_rp_pres+total_an_pres} présences")

# Save
with open("/tmp/s3_parsed.json", "w") as f:
    json.dump({
        "matrix_active": {str(k): v for k, v in MATRIX_ACTIVE.items()},
        "event_headers": event_headers,
        "event_types": event_types,
        "event_lists": event_lists,
        "ACTIVE_MAP": ACTIVE,
        "totals": {"ap": ap_count, "rp": rp_count, "an": an_count,
                   "ap_pres": total_ap_pres, "rp_pres": total_rp_pres, "an_pres": total_an_pres,
                   "nb_membres": 34}
    }, f, ensure_ascii=False, indent=2, default=str)
print("\nSauvé /tmp/s3_parsed.json")

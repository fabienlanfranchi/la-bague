# La Bague Impériale - PRD

## SESSION 14 Juin 2026 - 🔴 P0 Bug stats RÉSOLU + restauration en cours

### Cause racine identifiée (commit `bf17558` du 21/04/2026)
Un agent précédent a ajouté une fonction `recalculer_presences_saison()` **destructive** + un scheduler horaire qui appelait cette fonction. Conséquences sur les saisons historiques (S1-S12) :
- Les présences saisies manuellement étaient écrasées par un recalcul basé uniquement sur `reponses_sondages` / `reponses_manuelles`
- Or ces collections sont quasi vides pour les events historiques (juste un `total_presents` agrégé)
- Résultat : 31 membres sur 35 avec des % réduits par rapport à `members_data.json` (référence d'origine)

### Correctifs structurels appliqués (PROTECTION FUTURE)
✅ `Evenements.js` lignes 663 & 2276 : mapping `type_sondage` correct (anniversaire reste anniversaire)
✅ `server.py` `auto_fix_events` : suppression migration destructrice `simple→apero`
✅ `server.py` `recalculer_presences_saison()` :
   - Skip total si `saisons_config.is_manuel=True`
   - Utilise `$max` au lieu de `$set` (ne diminue jamais une valeur)
   - Backup automatique avant tout changement (collection `presences_membres_backup`)
✅ Backup complet effectué : `id=514ba3f2-61da-42d4-93be-5718c02cf181` (456 entrées)

### Restauration manuelle effectuée
✅ **Fabien Lanfranchi (Président)** restauré :
  - S12 : 8/11/1 → **100%**
  - S13 : 6/10/1 → 94%
  - Global : **97%** ⭐⭐⭐⭐ (209/215)
✅ **Anniversaire Café de la Plage** (13/06/2026 S13) recréé avec 27 membres présents

### 🔴 EN ATTENTE — Restauration complète saisons 1-13
L'utilisateur va envoyer des **tableaux Excel par saison** (lignes=membres, colonnes=événements+lieux, 1=présent).
À la réception, mettre à jour :
- `presences_membres` (par membre/saison)
- `saisons_config` (nb_aperos, nb_repas, nb_anniversaires)
- `evenements` (créer ceux qui manquent)
- Verrouiller les saisons en `is_manuel=True`

### ⚠️ Action utilisateur
- Redéployer en production via la console Emergent (correctifs frontend + backend)
- Uploader les fichiers Excel par saison

---

## Application Overview
Application full-stack React + FastAPI pour le club de cigares "La Bague Impériale". MongoDB (utilisateurs, comptabilité, événements) + MySQL OVH externe (catalogue de cigares).

## Core Features
- 35 membres du club
- Catalogue de 651 cigares (MySQL externe OVH)
- Winston - Assistant IA spécialiste cigares (Emergent LLM Key)
- Événements et présences (repas, apéro, anniversaire)
- Comptabilité multi-caisses, dettes, factures multi-lignes, paiements partiels
- Sondages et votes (anonymes)
- Trésorier (signalement de paiements + accès consultatif)
- Cigarothèque personnelle avec upload de photos

---

## BACKLOG / FUTURE TASKS

### P0 — Restauration complète présences depuis Excel utilisateur (EN ATTENTE FICHIERS)

### P2 - Refactorisation server.py (~8000 lignes)

### P2 - Refactorisation Dashboard.js

### P2 - Améliorer `/api/evenements/simple` (création historique) — accepter `membres_presents_ids`

---

## Test Credentials
Voir `/app/memory/test_credentials.md`
- **Président (Admin)** : clé `labague1` (Fabien Lanfranchi)
- **Trésorier** : clé `labague3` (Jacques Peretti)

---

## 3rd Party Integrations
- **OpenAI via Emergent LLM Key** : Winston Chat
- **OVH CloudDB (MySQL)** : Base cigares

---

## URLs
- Frontend Preview : https://cigare-finances.preview.emergentagent.com
- Production : https://labagueimperiale.optizioni.app (à redéployer)

---

## Scripts utiles créés cette session
- `/app/backend/diagnostic_stats.py` — audit lecture seule du global
- `/app/backend/audit_complet.py` — audit toutes saisons
- `/app/backend/diag_fabien.py` — détail Fabien event par event
- `/app/backend/restore_anniversaire_s13.py` — restauration anniversaire 13/06/2026
- `/app/backend/restore_fabien.py` — restauration Fabien S12+S13 (avec backup auto)

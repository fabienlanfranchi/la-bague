# La Bague Impériale - PRD

## SESSION 14 Juin 2026 - 🔴 P0 Bug stats Saison 13 RÉSOLU + Anniversaire restauré

### Cause racine identifiée
- **Frontend `Evenements.js` (lignes 663 & 2276)** : lors de la création d'un nouvel événement, le mapping `type_sondage` était cassé : tout type ≠ "repas" était envoyé comme `'simple'` au backend (au lieu de `'anniversaire'` / `'apero'`).
- **Backend `server.py` (startup `auto_fix_events`)** : une migration automatique convertissait `type_sondage='simple'` → `'apero'` à chaque démarrage. Conséquence : un événement Anniversaire créé via l'UI principale finissait classé en apéro, faussant le compteur `nb_anniversaires` et les présences individuelles.

### Correctifs appliqués
- ✅ **Frontend `Evenements.js`** : mapping correct `objet_type` → `type_sondage` (repas, apero, anniversaire, autre→apero). Lignes 663 et 2276.
- ✅ **Backend `server.py` `auto_fix_events`** : retrait de la migration destructrice `simple→apero`. Seul le nettoyage du doublon connu est conservé.
- ✅ **Restauration des données** : événement "Anniversaire Café de la Plage" (13/06/2026, Saison 13) recréé avec les 27 membres présents (script `/app/backend/restore_anniversaire_s13.py`). saisons_config.S13.nb_anniversaires=1, sum presences_anniversaires=27.

### Validations API
- `POST /api/evenements` avec `type_sondage='anniversaire'` → stocké correctement, `nb_anniversaires` incrémenté ✅
- `DELETE` → décrémente proprement ✅
- Stats Fabien Lanfranchi : 96% (cohérent, vraies données intactes) ✅
- Stats Saison 13 : 18 événements (7 apéros + 10 repas + 1 anniversaire), 285 présences ✅

### ⚠️ Action utilisateur requise
Redéployer l'application via la console Emergent pour propager les correctifs en production.

---

## Application Overview
Application de gestion complète pour le club de cigares "La Bague Impériale". Full-stack React + FastAPI app using MongoDB for state/users and external OVH MySQL database for cigar catalog.

## Core Features
- Gestion des 35 membres du club
- Catalogue de 651 cigares (MySQL externe OVH CloudDB)
- Winston - Assistant IA spécialiste des cigares (via Emergent LLM Key)
- Événements et présences (repas, apéro, anniversaire)
- Comptabilité multi-caisses, dettes, factures multi-lignes, paiements partiels
- Sondages et votes (anonymes)
- Onglet Trésorier (signalement de paiements + accès consultatif)
- Cigarothèque personnelle avec upload de photos

---

## BACKLOG / FUTURE TASKS

### P2 - Refactorisation server.py (~8000 lignes)
- routes/auth.py
- routes/members.py
- routes/cigares.py
- routes/evenements.py
- routes/comptabilite.py

### P2 - Refactorisation Dashboard.js
- Extraire `DashboardMembre`, `SondagesActifs`, `RelancesWhatsApp` en sous-composants

### P2 - Améliorer `/api/evenements/simple` (création historique)
- Permettre la saisie d'une liste de `membres_presents_ids` pour les événements historiques afin d'incrémenter `presences_membres` automatiquement (actuellement seul `total_presents: int` est accepté).

### Face ID / Touch ID (WebAuthn) - Prêt pour validation manuelle

---

## Technical Architecture
```
/backend/
├── server.py              # ~8016 lines (refacto en cours)
├── database.py
├── cigar_knowledge.py
├── routes/winston.py
├── tests/
├── restore_anniversaire_s13.py  # script one-shot du 14/06/2026
├── diagnostic_stats.py          # outil d'audit présences

/frontend/src/
├── pages/Dashboard.js
├── pages/Evenements.js     # FIX 14/06/2026 lignes 663 & 2276
├── pages/Comptabilite.js
├── pages/MembersPage.js
├── pages/TresorierPage.js
├── pages/Cigarotheque.js
├── pages/ProfilePage.js
├── components/Sidebar.js
└── context/UserContext.js
```

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
- Frontend: https://cigare-finances.preview.emergentagent.com
- API: https://cigare-finances.preview.emergentagent.com/api

---

## Historique des sessions (résumé)
- **28/04/2026** : Halo blanc Winston résolu (mask circulaire PNG)
- **22/04/2026** : Sondages anonymes Dashboard, purge tokens
- **21/04/2026** : Sondages génériques anonymes
- **12/04/2026** : Bouton "Marquer Absent" + Titres sidebar + Onglet Trésorier signalement
- **10/04/2026** : Tri colonnes Membres, Résumé Restaurateur, Cigarthèque hiérarchique, Favoris Cigares
- **09/04/2026** : Info prochain événement, Messagerie ciblée
- **Sessions précédentes** : Auth JWT, WhatsApp, Comptabilité, Winston, Catalogue cigares, etc.
- **Session précédente (fork)** : Trésorier consultatif Comptabilité + déclaration paiements liés (dettes, cotisations), upload photos Cigarothèque, factures multi-lignes paiements partiels, dettes multi-membres + invités, cigares Davidoff, séparation caisse/mode paiement, événements heure facultative + détail libre, dedupe Cigarothèque. **Bug stats S13 laissé en P0**.

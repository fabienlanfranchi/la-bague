# La Bague Impériale - Club de Cigares - PRD

## Original Problem Statement
Application de gestion complète pour le club de cigares "La Bague Impériale" avec gestion des membres, événements, statistiques, comptabilité, catalogue cigares et assistant IA.

## What's Been Implemented

### Session 22 Mars 2026 - Refonte Cigarothèque

**Refonte complète de la Cigarothèque (TERMINÉ) :**
- Importation des deux fichiers Excel fournis par l'utilisateur :
  - `habanoscope_cigares_2026.xlsx` : 210 cigares cubains
  - `cigaroscope_cigares_2025.xlsx` : 452 cigares non-cubains
- **Total : 857 cigares** dans le catalogue fusionné

**Nouveau schéma de données cigares :**
- `nom_cigare` : Nom commercial du cigare
- `marque` : Marque (Cohiba, Davidoff, Padrón, etc.)
- `gamme` : Gamme/Ligne (Behike, Linea 1492, etc.)
- `module` : Format générique (Robusto, Churchill, Corona, etc.)
- `vitole` : Spécification précise (robustos, marevas, etc.)
- `dimensions` : Dimensions exactes (ex: "124 mm x 50 (19,84 mm)")
- `terroir` : Pays d'origine (Cuba, Nicaragua, Honduras, etc.)
- `is_cubain` : Boolean pour filtrage rapide
- `bagues_etoiles` : Notation en étoiles (⭐ à ⭐⭐⭐⭐⭐)
- Notes de dégustation : `tiers1`, `tiers2`, `tiers3`

**Nouveaux filtres frontend :**
- Catégorie : Tous / Cubain (272) / Non-Cubain (585)
- Terroir : Nicaragua, Honduras, République dominicaine, Costa Rica, Mexique, Brésil
- Marque avec compteur
- Module avec compteur
- Puissance
- Prix

**Corrections de données :**
- 3 cigares Cohiba Behike (Genios, Mágicos, Secretos) corrigés
- Terroirs normalisés (ex: "Rép. dominicaine" → "République dominicaine")
- 650 cigares conservent leurs photos existantes

**API mises à jour :**
- `GET /api/cigares` : Nouveaux paramètres `is_cubain`, `terroir`, `module`
- `GET /api/cigares-filtres` : Retourne stats, terroirs avec comptage, marques avec comptage

### Session 14 Mars 2026

**Logique inverse de suppression de transactions (TERMINÉ) :**
- Quand l'admin supprime une transaction créée par validation d'un paiement membre :
  - La dette originale est automatiquement restaurée (tombola, album, anniversaire)
  - Ou la cotisation est incrémentée (+1 saison due)
  - Le paiement original est marqué "annulé" avec trace d'audit
- Lien `pending_payment_id` ajouté aux transactions validées

**Nouvelle stratégie d'authentification sans email (TERMINÉ) :**
- **Activation du compte** :
  - Option de garder le code temporaire `labagueimperialeXX` comme mot de passe
  - Ou créer un nouveau mot de passe personnalisé

- **Espace Mots de Passe Admin** :
  - Liste de tous les membres activés avec leurs mots de passe
  - Code temporaire + mot de passe actuel visibles
  - Bouton copier pour chaque mot de passe

- **Mot de passe oublié** :
  - Crée une demande de récupération (collection `demandes_mot_de_passe`)
  - Notification sur le Dashboard admin avec badge
  - L'admin envoie le mot de passe en privé au membre

### Sessions précédentes

**Système de paiements membres (TERMINÉ)**
**Sondages et événements (TERMINÉ)**
**Assistant IA "Winston" (TERMINÉ)**

## Prioritized Backlog

### P0 - Terminé ✅
- [x] Refonte Cigarothèque avec fichiers Excel utilisateur
- [x] Filtres Cubain/Non-Cubain/Terroir
- [x] Logique inverse suppression transactions
- [x] Nouvelle stratégie d'authentification sans email

### P1 - À faire
- [ ] **Activer l'authentification membre** - Désactiver le mode "accès ouvert" dans `UserContext.js`
- [ ] Investiguer le crash de la page Statistiques signalé

### P2 - Backlog
- [ ] Bouton "Copier" depuis Apéro du Club vers messages événements
- [ ] Corriger le nombre de repas Saison 13 (config en DB)

### P3 - Future
- [ ] Refactoring `server.py` en routers FastAPI
- [ ] Refactoring `Dashboard.js` en composants

## Technical Details

### Base de données Cigares (MySQL OVH)
- Host: gb60402-001.eu.clouddb.ovh.net
- Port: 35741
- User: cigare20
- Database: CIGARE
- **Table cigares** : 857 enregistrements
  - 272 cubains, 585 non-cubains
  - 650 avec photos
  - 260 marques uniques

### Répartition par Terroir
| Terroir | Cigares |
|---------|---------|
| Cuba | 272 |
| Nicaragua | 219 |
| République dominicaine | 164 |
| Honduras | 122 |
| Costa Rica | 17 |
| Mexique | 5 |
| Brésil | 1 |

### Comptes Admin
- Fabien Lanfranchi (n°1): fabienlanfranchi@yahoo.fr
- ID: d6b30499-2c9b-43e4-9402-7234da4c9855

### Codes d'activation membres
Format: labagueimperialeXX (XX = numéro membre)

## Key API Endpoints
- `POST /api/auth/validate-account` - Activation avec option use_temp_password
- `POST /api/auth/forgot-password` - Crée demande récupération
- `POST /api/auth/change-password` - Changer mot de passe
- `GET /api/admin/membres-mots-de-passe` - Liste mots de passe
- `GET /api/admin/demandes-mot-de-passe` - Demandes en attente
- `DELETE /api/transactions/{id}` - Suppression avec logique inverse

## Files Modified This Session
- `/app/backend/server.py` - Endpoints admin mots de passe, logique inverse
- `/app/frontend/src/pages/Dashboard.js` - Section demandes MDP, modal espace MDP
- `/app/frontend/src/pages/LoginPage.js` - Option garder code temporaire

## Tests Effectués
- ✅ Création/validation/suppression paiement avec restauration dette
- ✅ Création demande mot de passe oublié
- ✅ Affichage Dashboard avec notifications
- ✅ Modal espace mots de passe fonctionnel

## Prochaine étape critique
Activer l'authentification membre en désactivant le mode "accès ouvert" dans `UserContext.js` pour permettre aux 35 membres de se connecter.

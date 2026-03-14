# La Bague Impériale - Club de Cigares - PRD

## Original Problem Statement
Application de gestion complète pour le club de cigares "La Bague Impériale" avec gestion des membres, événements, statistiques, comptabilité, catalogue cigares et assistant IA.

## What's Been Implemented

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
  - Stockage du mot de passe en clair pour l'admin (`password_clair`)

- **Espace Mots de Passe Admin** :
  - Liste de tous les membres activés avec leurs mots de passe
  - Code temporaire + mot de passe actuel visibles
  - Bouton copier pour chaque mot de passe

- **Mot de passe oublié** :
  - Crée une demande de récupération (collection `demandes_mot_de_passe`)
  - Notification sur le Dashboard admin avec badge
  - Boutons "Voir MDP" et "Traité" pour chaque demande
  - L'admin envoie le mot de passe en privé au membre

**Nouveaux endpoints API :**
- `GET /api/admin/membres-mots-de-passe` - Liste des mots de passe membres
- `GET /api/admin/demandes-mot-de-passe` - Demandes de récupération en attente
- `GET /api/admin/demandes-mot-de-passe/count` - Compteur pour badge
- `POST /api/admin/demandes-mot-de-passe/{id}/traiter` - Marquer comme traité
- `DELETE /api/admin/demandes-mot-de-passe/{id}` - Supprimer une demande
- `POST /api/auth/change-password` - Changer son mot de passe

### Sessions précédentes

**Système de paiements membres (TERMINÉ) :**
- Les membres peuvent signaler un paiement depuis leur profil
- L'admin valide sur le Dashboard, crée automatiquement la transaction
- La dette correspondante est supprimée

**Sondages et événements (TERMINÉ) :**
- Réponses manuelles pour invités/membres sans accès
- Drill-down sur les résultats (voir qui a choisi quoi)
- Export SMS pour restaurateurs

**Cigarthèque complète (TERMINÉ) :**
- 657 cigares avec photos
- Assistant IA "Winston" (Claude Sonnet 4.5)
- Collection personnelle "Ma Cigarthèque"
- Apéro du Club avec gestion admin

## Prioritized Backlog

### P0 - Terminé ✅
- [x] Logique inverse suppression transactions
- [x] Nouvelle stratégie d'authentification sans email
- [x] Espace mots de passe admin

### P1 - À faire
- [ ] **Activer l'authentification membre** - Désactiver le mode "accès ouvert" dans `UserContext.js`
- [ ] Tester le flux complet d'activation pour les 35 membres

### P2 - Backlog
- [ ] Bouton "Copier" depuis Apéro du Club vers messages événements
- [ ] Construire les onglets "Jeux" et "Instagram"
- [ ] Corriger le nombre de repas Saison 13 (config en DB)

### P3 - Future
- [ ] Refactoring `server.py` en routers FastAPI
- [ ] Refactoring `Dashboard.js` en composants
- [ ] Corriger troncature `conclusion` cigares (base MySQL externe)

## Technical Details

### Base de données MongoDB - Nouvelles collections
- `demandes_mot_de_passe` - Demandes de récupération mot de passe
- `paiements_en_attente` - Paiements signalés par membres

### Champs membres ajoutés
- `password_clair` - Mot de passe en clair (pour admin)

### Champs transactions ajoutés
- `pending_payment_id` - Lien vers paiement d'origine (pour logique inverse)

### Base de données Cigares (MySQL OVH)
- Host: gb60402-001.eu.clouddb.ovh.net
- Port: 35741
- User: cigare20
- Database: CIGARE

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

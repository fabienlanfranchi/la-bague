# La Bague Impériale - Club de Cigares - PRD

## Original Problem Statement
Application de gestion complète pour le club de cigares "La Bague Impériale" avec gestion des membres, événements, statistiques, comptabilité, catalogue cigares et assistant IA.

## What's Been Implemented

### Session 10 Mars 2026 (Suite)

**Système de connexion membre:**
- Page de login avec activation par code `labagueimperialeXX`
- Validation du compte (email + mot de passe)
- "Rester connecté" et "Mot de passe oublié"
- Conseil de mot de passe: `prenom + numéro`

**Catalogue Cigares (MySQL OVH):**
- Connexion à la base OVH (gb60402-001.eu.clouddb.ovh.net:35741)
- 657 cigares avec recherche et filtres
- Filtres: Marque, Pays, Puissance, Module (vitole), Prix
- Fiches détaillées avec notes de dégustation
- "Ma Cigarthèque" (collection personnelle par membre)
- "Apéro du Club" (admin - cigares fumés aux événements)
- Boutons: Copier fiche, Ajouter à collection, Supprimer

**Améliorations UI:**
- Tailles de texte augmentées (lisibilité)
- Boutons "Copier" sur les messages
- 2 liens WhatsApp (Membres + Bureau)
- Page Jeux avec lien GameLab

**Comptabilité:**
- Données nettoyées (899€ Compte, 632€ PayPal)
- Transaction abonnement Asso Connect (336€)

**Sondages:**
- Système complet avec persistance MongoDB
- Création, vote, suppression

### Session Précédente
- Système de dettes "Dehors" avec règlement automatisé
- Boutons "Détails" sur les comptes
- Permissions admin pour événements
- Corrections statistiques et profil

## Prioritized Backlog

### P0 - En cours
- [ ] Fonction "Modifier" cigare (admin) - code backend ajouté, frontend à finir
- [ ] Afficher les photos des cigares (besoin URL du serveur PHP)
- [ ] Corriger encodage caractères spéciaux

### P1 - À faire
- [ ] Assistant IA Claude (playbook disponible)
- [ ] Refonte page Messages admin
- [ ] Sécuriser les routes (protection login quand prêt)

### P2 - Future
- [ ] Notifications admin détaillées
- [ ] Page Instagram
- [ ] Envoi email (mot de passe oublié)

## Technical Details

### Base de données Cigares (MySQL OVH)
- Host: gb60402-001.eu.clouddb.ovh.net
- Port: 35741
- User: cigare20
- Database: CIGARE
- Table: cigares (657 entrées)
- Colonne photo: ./photos_cigares/... (653 cigares avec photo)

### Comptes Admin
- Fabien Lanfranchi (n°1): fabienlanfranchi@yahoo.fr / fabienlanfranchi01

### Codes d'activation membres
Format: labagueimperialeXX (XX = numéro membre)

## Key API Endpoints
- GET/POST /api/cigares - Catalogue avec filtres
- GET /api/cigares-filtres - Options de filtres
- PUT /api/cigares/{id} - Modifier un cigare (admin)
- GET/POST/DELETE /api/ma-cigarotheque/{membre_id}
- GET/POST/DELETE /api/apero-club
- POST /api/auth/login - Connexion
- POST /api/auth/validate-account - Activer compte

## Files Modified This Session
- /app/backend/server.py - Endpoints cigares MySQL
- /app/frontend/src/pages/Cigarotheque.js - Catalogue complet
- /app/frontend/src/pages/LoginPage.js - Système connexion
- /app/frontend/src/pages/Comptabilite.js - Tailles texte
- /app/frontend/src/pages/Messages.js - Boutons copier + WhatsApp
- /app/frontend/src/pages/Jeux.js - Lien GameLab
- /app/frontend/src/pages/Sondages.js - Système complet
- /app/frontend/src/context/UserContext.js
- /app/frontend/src/App.js - Routes

## Questions en attente
1. URL du serveur PHP pour les photos de cigares ?
2. Intégration email (SendGrid/Resend/Gmail) ?

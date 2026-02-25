# La Bague Impériale - PRD

## Description
Application de gestion pour le club de cigares "La Bague Impériale". Permet de gérer les membres, la comptabilité, les événements et plus encore.

## Stack Technique
- **Frontend**: React, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **URL Preview**: https://cigar-club-events.preview.emergentagent.com

## Fonctionnalités Implémentées

### Dashboard (✅ Complet)
- Vue d'ensemble avec statistiques du club
- Système d'étoiles (⭐) pour la participation des membres
- Stats cliquables affichant la liste des membres

### Membres (✅ Complet)
- Liste complète des 35 membres
- Profil détaillé avec historique des cotisations (vert=payé, rouge=impayé)
- Modal d'édition fonctionnel
- Authentification avec mot de passe temporaire

### Comptabilité (✅ Complet)
- Vue des comptes (Compte Bancaire, Chez Fabien, Chez Jacques, PayPal, Dehors)
- Tableau interactif des mouvements (transactions)
- Ajout de recettes/dépenses avec mise à jour automatique des soldes
- Gestion des cotisations (200€/saison)

### Événements (✅ Complet - Mis à jour 2024-12)
- Section "Prochain événement" avec détails et sondage
- **Historique des saisons** (13 saisons, 2013-2026)
- **Contrôle total des événements historiques**:
  - Modifier : Lieu, Date (jj/mm/aa), Type (Repas/Apéro/Anniversaire), Nombre de présences
  - Ajouter un événement à une saison
  - Supprimer un événement
  - Tri automatique par date (du 1er au dernier de la saison)
- 173 événements dans l'historique

## API Endpoints

### Auth
- `POST /api/auth/login` - Connexion
- `POST /api/auth/validate-account` - Validation compte
- `GET /api/auth/me` - Utilisateur courant
- `POST /api/auth/logout` - Déconnexion

### Membres
- `GET /api/members` - Liste des membres
- `POST /api/members` - Créer un membre
- `GET /api/members/{id}` - Détail membre
- `PUT /api/members/{id}` - Modifier membre
- `DELETE /api/members/{id}` - Supprimer membre

### Comptabilité
- `GET /api/comptes` - Liste des comptes
- `POST /api/comptes` - Créer un compte
- `GET /api/transactions` - Liste des transactions
- `POST /api/transactions` - Créer une transaction
- `DELETE /api/transactions/{id}` - Supprimer transaction

### Événements
- `GET /api/evenements` - Liste des événements
- `POST /api/evenements` - Créer événement (à venir)
- `POST /api/evenements/simple` - Créer événement historique (terminé)
- `PUT /api/evenements/{id}` - Modifier événement (tous champs)
- `DELETE /api/evenements/{id}` - Supprimer événement

## Tâches à venir (Backlog)

### P1 - Messages
- Messagerie interne entre membres
- Notifications
- Système de polling pour les événements

### P2 - Autres onglets
- Jeux
- Boutique
- Cigarothèque
- Assistant IA
- Instagram

## Notes techniques

### Cotisation
- 200€ par saison
- situation_cotisation: 0 = à jour, 1+ = saisons dues

### Types d'événements
- **repas** : Badge gris, sondage complet (entrée/plat/dessert)
- **apero** : Badge bleu, sondage simple (oui/non)
- **anniversaire** : Badge rouge, sondage simple

### Saisons
- Saison 1 = 2013-2014
- Saison 13 = 2025-2026 (actuelle)

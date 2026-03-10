# La Bague Impériale - Club de Cigares - PRD

## Original Problem Statement
Application de gestion complète pour le club de cigares "La Bague Impériale" avec gestion des membres, événements, statistiques, comptabilité et assistant IA.

## What's Been Implemented

### Session 10 Mars 2026
- **Système de règlement de dettes complet:**
  - Modal "Régler une dette" avec Shadcn/UI Select pour choix du compte destination
  - Workflow automatisé: Clic "Réglé" → Sélection compte → Virement Dehors→Compte → Suppression dette
  - Z-index géré pour affichage modal au-dessus de la modal Détails
  - Tests automatisés: 100% backend (15/15 tests), 100% frontend

### Session Précédente (Mars 2026)
- **Comptabilité améliorée:**
  - Dropdowns iOS compatibles avec Shadcn Select
  - Options Objet: Cotisation, Album, Tombola, Anniversaire, Autres
  - Options Caisse: Compte, Chez Fabien, Chez Jacques, PayPal, Asso Connect, Chèque
  - Liste des 35 membres dans les dropdowns
  - Section "Dehors (Dettes)" avec 480€ détaillés en 5 dettes
  - Boutons "Détails" sur chaque caisse montrant les mouvements
  - Solde Total inclut maintenant les dettes Dehors (3 397€)
  - Virement Dehors → Compte possible pour paiement de dette
  - Automatisation: paiement dette = virement + suppression dette + mise à jour profil membre

- **Corrections précédentes:**
  - Pastilles rouges de notification supprimées
  - Profil: toutes les cotisations depuis l'entrée affichées
  - Sondage repas: choix de menu pour les membres
  - Stats événement: Présents, Absents, En attente
  - Bug suppression événement corrigé
  - Création d'événements réservée au président
  - Automatisation cotisation → décrémente situation_cotisation

### Fonctionnalités Existantes
- Dashboard admin avec statistiques temps réel
- Gestion des membres (35 membres)
- Gestion des événements (création, modification, suppression)
- Système de sondages avec choix de menu
- Statistiques par saison avec graphiques
- Page Boutique avec lien externe
- Sauvegarde des données

## Architecture
- Frontend: React + Tailwind CSS + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- Database: MongoDB

## Prioritized Backlog

### P0 - COMPLÉTÉ ✅
- ~~Bouton "Détails" pour chaque caisse~~ ✅
- ~~Modal de règlement automatisé des dettes~~ ✅

### P1 - À faire prochainement
- Refonte page Messages admin (attente charte + lien WhatsApp)
- Assistant IA Claude (playbook récupéré, prêt à implémenter)
- Modification options repas dans modal événement

### P2 - Future
- Cigarothèque personnelle par membre
- Page Jeux
- Page Instagram
- Notifications admin détaillées

## Key Data Models
- members: 35 membres avec situation_cotisation, etoiles, saisons_exclues
- dettes: membre_id, montant, cause (lié au profil membre)
- evenements: avec options_sondage pour les repas
- transactions: mouvements comptables
- comptes: caisses du club
- saisons_config: configuration par saison

## API Endpoints Clés
- GET/POST /api/dettes - Gestion des dettes
- GET /api/dettes/membre/{id} - Dettes d'un membre
- POST /api/virements - Virements entre comptes (gère Dehors)
- GET/POST /api/transactions - Mouvements comptables

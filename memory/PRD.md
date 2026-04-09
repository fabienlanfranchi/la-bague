# La Bague Impériale - PRD

## Application Overview
Application de gestion complète pour le club de cigares "La Bague Impériale". Full-stack React + FastAPI app using MongoDB for state/users and external OVH MySQL database for cigar catalog.

## Core Features
- Gestion des 35 membres du club
- Catalogue de 651 cigares (MySQL externe OVH CloudDB)
- Winston - Assistant IA spécialiste des cigares (Claude via Emergent LLM Key)
- Événements et présences
- Comptabilité et cotisations
- Sondages et votes

---

## COMPLETED (Session 9 Avril 2026)

### Info - Prochain événement (P0) - DONE
- **Fonctionnalité** : Nouveau template dans Messages pour annoncer un événement à venir avant sa création officielle
- **Frontend** (`Messages.js`) :
  - Template "Info - Prochain événement" avec icône cyan
  - Modal spécial avec choix type (repas/apéro), calendrier de date, champ lieu
  - Aperçu du message en temps réel
  - Envoi automatique à tous les membres
- **Backend** (`server.py`) :
  - API `POST/GET/DELETE /api/prochain-evenement-info`
  - Modèle `ProchainEvenementInfo` (type_evenement, date, lieu, actif)
  - Désactivation automatique des anciennes infos
- **Dashboard Membre** :
  - Section "Prochain événement" avec style cyan distinct
  - Affiche badge type, date formatée et lieu
  - Visible uniquement quand pas d'événement officiel
- Tests validés à 100% (Backend: 9/9, Frontend: tous les flows)

### Messagerie interne ciblée (P0) - DONE
- **Fonctionnalité** : Permet au Président d'envoyer des messages à des membres spécifiques au lieu de tous les membres
- **Frontend** (`Messages.js`) :
  - Checkbox "Tous les membres (35)" (cochée par défaut)
  - Décocher révèle une liste scrollable de 35 membres avec checkboxes individuelles
  - Sélection multiple possible
- **Backend** (`server.py`) :
  - API `POST /api/messages` accepte un tableau `destinataires: List[str]`
  - Si `destinataires=[]` → envoie à tous les 35 membres
  - Si `destinataires=[id1, id2]` → envoie uniquement à ces 2 membres
- Tests validés à 100% (Backend: 6/6, Frontend: tous les flows)

---

## COMPLETED (Session 3 Avril 2026)

### Corrections Bugs Critiques (P0) - DONE
1. **"Rester connecté" persistant** — Corrigé dans `UserContext.js`
   - Le rafraîchissement des données en arrière-plan n'écrase plus la session
   - Mise à jour silencieuse de l'état sans déclencher la logique de persistance
   
2. **Winston appelle "Président"** — Corrigé dans `routes/winston.py`
   - Force la reconstruction du contexte pour le Président à chaque message
   - Winston utilise maintenant "Président" ou "Monsieur le Président", jamais "Fabien"
   
3. **Lien GameLab mis à jour** — Corrigé dans `pages/Jeux.js`
   - Nouvelle URL: `https://game-lab-play.base44.app/PublicProfile?pseudo=La%20Table%20Haute`

---

## COMPLETED (Session 30 Mars 2026)

### Section Paramètres dans le Profil (P0) - DONE
- Nouvel onglet "Paramètres" ajouté dans `/profile`
- **Informations du compte** : Affiche email et nom du membre
- **Sécurité** : Bouton "Changer mon mot de passe" avec modal complète
  - Validation du mot de passe actuel
  - Nouveau mot de passe (min 6 caractères)
  - Confirmation du nouveau mot de passe
  - API `/api/auth/change-password` fonctionnelle
- **Session** : Bouton "Se déconnecter" avec redirection vers /login
- Tests validés à 100% (Backend + Frontend)

### Page Aide mise à jour - DONE
- Section "Profil" enrichie avec les nouvelles fonctionnalités

---

## COMPLETED (Sessions précédentes)

### Sécurité Production
- Bouton "Accès direct (Président)" supprimé
- Connexion obligatoire via email/mot de passe

### Fonctionnalités WhatsApp
- **Cigarthèque** : Bouton partage sur chaque fiche cigare (API Web Share native)
- **Événements** : Bouton "Partager" + "Relance"
- Format de message : "Lundi 15 Avril" au lieu de "15/04"

### Session Persistante
- Checkbox "Rester connecté" fonctionnel
- localStorage pour session persistante
- sessionStorage pour session temporaire

### Page Aide créée (/aide)
- Guide d'utilisation complet
- Sections dépliables avec détails
- Membres : voient uniquement leurs onglets (jaune)
- Admin : voit aussi les onglets admin (rouge avec badge ADMIN)

### Base de données cigares
- 651 cigares avec prix, puissance (A/B/C), terroir - 100% complet

### Refactorisation backend (partielle)
- routes/winston.py extrait (512 lignes)
- server.py réduit de 6472 à ~5960 lignes

---

## BACKLOG / FUTURE TASKS

### Face ID / Touch ID (WebAuthn) - DONE
**Statut** : Prêt pour validation utilisateur
- Intégration WebAuthn complète (frontend + backend)
- **Correction appliquée** : Le RP_ID utilise maintenant le bon domaine public (`club-messagerie.preview.emergentagent.com`) au lieu du domaine interne Kubernetes
- Variable d'environnement `WEBAUTHN_ORIGIN` ajoutée au backend/.env
- Tests API validés à 100% (9/9)
- **À tester manuellement** : Enregistrement et authentification biométrique sur appareil iOS/macOS

### P2 - Refactorisation server.py
**Statut** : En cours (Plan créé dans `/app/backend/REFACTORING_PLAN.md`)
- server.py fait encore ~5960 lignes
- Prochaines extractions :
  - routes/auth.py (~400 lignes)
  - routes/members.py (~300 lignes)
  - routes/cigares.py (~1500 lignes)
  - routes/evenements.py (~800 lignes)
  - routes/comptabilite.py (~600 lignes)

### P2 - Vérification "Copier" Apéro du Club
- Vérifier si le nouveau bouton "Partager" natif satisfait déjà ce besoin

---

## Technical Architecture

```
/backend/
├── server.py              # Main app (~5960 lines)
├── database.py            # DB connections
├── models.py              # Pydantic models
├── cigar_knowledge.py     # Winston's brain
├── routes/
│   └── winston.py         # AI Assistant routes
├── tests/                 # PyTest files
│   └── test_profile_settings.py
├── REFACTORING_PLAN.md

/frontend/
├── src/
│   ├── pages/
│   │   ├── ProfilePage.js     # With new Settings tab
│   │   ├── Aide.js            # Guide d'utilisation
│   │   ├── AssistantIA.js     # Winston
│   │   ├── Evenements.js      # With Partager/Relance buttons
│   │   └── LoginPage.js       # Auth (Activation + Connexion)
│   ├── context/
│   │   └── UserContext.js     # Session management
│   ├── components/ui/         # Shadcn components
```

---

## Test Credentials
- **Email**: `fabien.lanfranchi@yahoo.fr`
- **Password**: `fabienlabague1`
- **Role**: Président (Admin)

---

## 3rd Party Integrations
- **OpenAI via Emergent LLM Key** : Winston Chat
- **OVH CloudDB (MySQL)** : Database Cigares

---

## URLs
- Frontend: https://club-messagerie.preview.emergentagent.com
- API: https://club-messagerie.preview.emergentagent.com/api

---

## Ready for Production
L'application est fonctionnelle et prête à être déployée.
- Authentication sécurisée
- 651 cigares complets
- Winston IA opérationnel
- Interface mobile optimisée
- Partage natif WhatsApp

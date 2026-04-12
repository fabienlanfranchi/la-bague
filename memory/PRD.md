# La Bague Impériale - PRD

## Application Overview
Application de gestion complète pour le club de cigares "La Bague Impériale". Full-stack React + FastAPI app using MongoDB for state/users and external OVH MySQL database for cigar catalog.

## Core Features
- Gestion des 35 membres du club
- Catalogue de 651 cigares (MySQL externe OVH CloudDB)
- Winston - Assistant IA spécialiste des cigares (via Emergent LLM Key)
- Événements et présences
- Comptabilité et cotisations
- Sondages et votes

---

## COMPLETED (Session 12 Avril 2026)

### Bouton "Marquer Absent" pour les non-répondants (P0) - DONE
- **Fonctionnalité** : L'admin peut marquer un membre non-répondant comme "Absent" depuis le Dashboard
- **Frontend** (`Dashboard.js`) :
  - Bouton "Absent" (icône UserX rouge) à côté de chaque membre dans la liste des non-répondants
  - Fonction `handleMarkAbsent(membre)` envoie une réponse manuelle avec `present: false`
  - Le membre disparaît de la liste après marquage
- **Backend** : Utilise l'API existante `POST /api/reponses-manuelles` avec `type: membre_manuel, present: false`
- **Action manuelle** : Marc Antoine Guillot marqué absent pour l'événement en cours
- Tests validés à 100% (Backend: 11/11, Frontend: 13/13)

### Titres des membres dans la sidebar et le profil (P0) - DONE
- **Fonctionnalité** : Afficher le titre/fonction du membre sous son nom dans la sidebar
- **Sidebar** (`Sidebar.js`) : Affiche "TRÉSORIER", "SECRÉTAIRE" ou "MEMBRE" selon la fonction
- **Base de données** : 
  - Jacques François Amadei : "Vice Trésorier" → "Trésorier"
  - Jean François Vesperini : "Vice Secrétaire" → "Secrétaire"
- **Profil** : La fonction s'affiche déjà via `currentMember.fonction`

### Onglet Trésorier - Signalement de paiement (P0) - DONE
- **Fonctionnalité** : Page dédiée pour le Trésorier (Jacques Peretti) permettant de signaler des paiements
- **Frontend** (`TresorierPage.js`) :
  - Formulaire identique au "Nouveau mouvement" admin (Date, Type, Membre, Objet, Montant, Caisse, Détail)
  - Message d'avertissement : "Ce signalement sera envoyé au Président pour validation"
  - Historique des signalements avec statuts (En attente, Validé, Refusé)
- **Sidebar** : Menu "Trésorier" visible uniquement pour les membres ayant la fonction "Trésorier"
- **Route** : `/tresorier` protégée (ProtectedRoute)
- **Workflow** : Trésorier signale → Président valide/refuse → Mouvement comptable créé si validé
- Tests validés à 100%

---

## COMPLETED (Session 10 Avril 2026)

### Tri des colonnes - Page Membres (P0) - DONE
### Résumé Intelligent Restaurateur (P0) - DONE
### Organisation hiérarchique de Ma Cigarthèque (P0) - DONE
### Favoris Cigares Global (P0) - DONE

---

## COMPLETED (Session 9 Avril 2026)

### Info - Prochain événement (P0) - DONE
### Messagerie interne ciblée (P0) - DONE

---

## COMPLETED (Sessions précédentes)

### Corrections Bugs Critiques - DONE
### Section Paramètres dans le Profil - DONE
### Sécurité Production - DONE
### Fonctionnalités WhatsApp - DONE
### Session Persistante - DONE
### Page Aide - DONE
### Base de données cigares - DONE
### Refonte IA Winston (expert sommelier) - DONE
### Redirection automatique vers Dashboard - DONE
### Message d'accueil dynamique - DONE
### Correction bug comptabilité (Dehors 480→380€) - DONE
### Filtres historique mouvements - DONE
### Partages WhatsApp améliorés - DONE

---

## BACKLOG / FUTURE TASKS

### P2 - Refactorisation server.py
**Statut** : En cours (Plan créé dans `/app/backend/REFACTORING_PLAN.md`)
- server.py fait encore ~6300 lignes
- Prochaines extractions :
  - routes/auth.py (~400 lignes)
  - routes/members.py (~300 lignes)
  - routes/cigares.py (~1500 lignes)
  - routes/evenements.py (~800 lignes)
  - routes/comptabilite.py (~600 lignes)

### P2 - Extraction DashboardMembre
- Extraire le composant `DashboardMembre` depuis `Dashboard.js` dans son propre fichier

### Face ID / Touch ID (WebAuthn) - Prêt pour validation
- Intégration WebAuthn complète
- À tester manuellement sur appareil iOS/macOS

---

## Technical Architecture

```
/backend/
├── server.py              # Main app (~6300 lines)
├── database.py            # DB connections
├── models.py              # Pydantic models (inline in server.py)
├── cigar_knowledge.py     # Winston's brain
├── routes/
│   └── winston.py         # AI Assistant routes (NE PAS MODIFIER LE PROMPT)
├── tests/
│   ├── test_new_features.py
│   └── ...

/frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.js       # Admin + Membre dashboards
│   │   ├── TresorierPage.js   # NEW - Espace Trésorier
│   │   ├── Comptabilite.js    # Comptabilité admin
│   │   ├── MembersPage.js     # Liste des membres
│   │   ├── ProfilePage.js     # Profil membre
│   │   ├── LoginPage.js       # Authentification
│   │   └── ...
│   ├── components/
│   │   ├── Sidebar.js         # Navigation (titres dynamiques)
│   │   └── InitialRedirect.js # Redirection vers Dashboard
│   ├── context/
│   │   └── UserContext.js     # Session management
```

---

## Test Credentials
- **Admin (Président)** : Clé `labague1` (Fabien Lanfranchi)
- **Membre (Trésorier)** : Clé `labague3` (Jacques Peretti)

---

## 3rd Party Integrations
- **OpenAI via Emergent LLM Key** : Winston Chat
- **OVH CloudDB (MySQL)** : Database Cigares

---

## URLs
- Frontend: https://cigar-management-app.preview.emergentagent.com
- API: https://cigar-management-app.preview.emergentagent.com/api

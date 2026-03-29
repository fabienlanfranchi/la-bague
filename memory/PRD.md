# La Bague Impériale - PRD

## Application Overview
Application de gestion complète pour le club de cigares "La Bague Impériale". Full-stack React + FastAPI app using MongoDB for state/users and external OVH MySQL database for cigar catalog.

## Core Features

### Authentication & Users
- Member login with activation codes
- President (Fabien) admin mode with enhanced privileges
- "Accès direct (Président)" bypass button (à supprimer pour production)

### Winston AI Assistant
- Expert cigar sommelier (Concierge) powered by OpenAI via Emergent LLM Key
- 11-part comprehensive cigar guide ("Tout sur le cigare")
- Strict recommendation matrices based on User Level (Beginner to Expert) + Time of Day
- Knows all 35 club members' tastes and event attendances
- Separate chat histories per user
- Guided "Choix de cigare" flow

### Cigar Database (MySQL OVH)
- Complete catalog: 651 cigars
- 100% with prices, puissance (A/B/C), terroir
- Admin duplicate scanner tool

### Club Management
- Event tracking and attendance
- Member statistics and presence rates
- Comptabilité (accounting)
- Messaging system

---

## ✅ COMPLETED WORK

### Session 6 (March 29, 2025)
- **Mobile Layout Fix**: Refactored AssistantIA.js for mobile-first design
  - Horizontal scrollable carousel for capabilities badges on mobile
  - Compact header, reduced chat elements
  - "Choix de cigare" button immediately visible
  
- **Winston Flow Improved**: 
  - Fixed "Choix de cigare" guided flow (no re-introduction after user answers)
  - Removed "à jeun" terminology
  - Added member differentiation (Fabien vs Président mode)

- **Database Complete**:
  - Updated 39 cigars with puissance and terroir
  - Database now 100% complete: 651 cigars with all fields

- **Code Refactoring**:
  - Created `/backend/routes/winston.py` module
  - Extracted ~512 lines from server.py
  - server.py reduced from 6472 → 5960 lines (-8%)
  - Created `/backend/database.py` for DB connections
  - Created `/backend/models.py` for Pydantic models
  - Created `/backend/REFACTORING_PLAN.md`

---

## 🚀 READY FOR PUBLICATION

L'application est prête à être publiée. Tous les tests passent :
- ✅ Login fonctionne
- ✅ 651 cigares avec données complètes
- ✅ 35 membres chargés
- ✅ Winston IA fonctionne
- ✅ Guide 11 parties accessible
- ✅ Interface mobile optimisée

### Avant invitation des membres :
1. Supprimer le bouton "Accès direct (Président)" (sécurité)

---

## Technical Architecture

```
/backend/
├── server.py              # Main app (5960 lines)
├── database.py            # DB connections
├── models.py              # Pydantic models
├── cigar_knowledge.py     # Winston's brain
├── routes/
│   ├── __init__.py
│   └── winston.py         # AI Assistant routes
├── REFACTORING_PLAN.md

/frontend/
├── src/
│   ├── pages/
│   │   ├── AssistantIA.js      # Winston UI (mobile-optimized)
│   │   ├── ToutSurLeCigare.js  # Guide
│   │   ├── Cigarotheque.js     # Catalog
│   │   └── ...
```

## Database Stats
- **MongoDB**: comptes, evenements, reponses_evenements, chat_history
- **MySQL OVH**: 651 cigares (100% complete)

## 3rd Party Integrations
- **OpenAI** via Emergent LLM Key (Winston)
- **OVH CloudDB MySQL** - Cigar database

## Test Credentials
- Email: `fabien.lanfranchi@yahoo.fr`
- Password: `fabienlabague1`

# La Bague Impériale - PRD

## Application Overview
Application de gestion complète pour le club de cigares "La Bague Impériale". Full-stack React + FastAPI app using MongoDB for state/users and external OVH MySQL database for cigar catalog.

## Core Features

### Authentication & Users
- Member login with activation codes
- President (Fabien) admin mode with enhanced privileges
- "Accès direct (Président)" bypass button (to be removed for production)

### Winston AI Assistant
- Expert cigar sommelier (Concierge) powered by OpenAI via Emergent LLM Key
- 11-part comprehensive cigar guide ("Tout sur le cigare")
- Strict recommendation matrices based on User Level (Beginner to Expert) + Time of Day
- Knows all 35 club members' tastes and event attendances
- Separate chat histories per user
- Guided "Choix de cigare" flow

### Cigar Database (MySQL OVH)
- Complete catalog with prices, terroir, puissance, module, etc.
- Admin duplicate scanner tool
- Price management

### Club Management
- Event tracking and attendance (reponses_evenements)
- Member statistics and presence rates
- Comptabilité (accounting)
- Messaging system

---

## Completed Work (March 2025)

### Session 1-4
- Initial app setup with React + FastAPI + MongoDB
- Member authentication system
- Cigar catalog integration with OVH MySQL
- Event management system
- Basic Winston AI chat

### Session 5 (March 29, 2025)
- **Bulk Price Updates**: Updated 84 Cuban cigar prices and 29 non-Cuban prices via SQL scripts
- **Duplicate Cigar Tool Upgrade**: Restored "Doublons Cigares" tab in AdminCigarotheque.js, scanning entire DB for exact name/brand matches (49 pairs found)
- **Database Cleanup**: Deleted fake/duplicate cigars (Aliados Original, Horacio 10 Anniversario, La Estancia 60), fixed Vegafina casing bug
- **Terroir UI Fix**: Fixed Cigarotheque.js to display terroir field properly
- **"Tout sur le cigare" Page**: Built responsive React page with 11-part markdown guide, anchor scrolling, collapsible mobile menus
- **Winston AI Brain Upgrade**: Expanded cigar_knowledge.py with strict recommendation matrices
- **Winston Context Injection**: Dynamic injection of top 5 active members, events + attendees, member cigar collections
- **Chat History Separation**: Separate histories per user, distinct Fabien Admin vs Member modes
- **Guided Chat Buttons**: "Choix de cigare" action button

### Session 6 (March 29, 2025)
- **Mobile Layout Fix**: Refactored AssistantIA.js for mobile-first design
  - Horizontal scrollable carousel for capabilities badges on mobile
  - Compact header (reduced from 4xl to 2xl)
  - Reduced chat header with smaller avatars and buttons
  - Optimized input area height
  - "Choix de cigare" button immediately visible without scrolling

---

## In Progress / Blocked

### P1 - Missing Cigar Prices
- ~4 cigars still missing prices (Cohiba Behike, Quai d'Orsay 50e, Romeo y Julieta 150e, San Cristóbal Reinas)
- **Status**: BLOCKED - Waiting for user data

### P1 - Missing Puissance Data
- 38 cigars missing puissance values
- **Status**: Waiting for user data

---

## Backlog

### P2 - Security
- Remove "Accès direct (Président)" bypass button for production

### P2 - Code Refactoring
- `backend/server.py` is 6300+ lines - needs to be split into modular FastAPI routers:
  - /routes/auth.py
  - /routes/cigares.py
  - /routes/ai.py
  - /routes/events.py
  - /routes/members.py

### P3 - Features
- Implement "Copier" from "Apéro du Club" to event messages

---

## Technical Architecture

```
/app/
├── backend/
│   ├── server.py             # ALL FastAPI routes (6300+ lines - needs refactor)
│   ├── cigar_knowledge.py    # Winston's brain: guides + recommendation matrices
│   └── .env                  # MONGO_URL, EMERGENT_LLM_KEY
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AssistantIA.js         # Winston Chat UI (mobile-optimized)
│   │   │   ├── ToutSurLeCigare.js     # Cigar guide page
│   │   │   ├── AdminCigarotheque.js   # Admin tools (Duplicates)
│   │   │   ├── Cigarotheque.js        # Catalog UI
│   │   └── components/
│   │       └── Sidebar.js
│   └── .env                  # REACT_APP_BACKEND_URL
```

## Database Schema

### MongoDB
- `comptes` - Member profiles
- `evenements` - Club events
- `reponses_evenements` - Event attendance
- `chat_history` - Winston chat logs (separated by user_id)

### MySQL (OVH CloudDB)
- `cigares` - External cigar catalog
  - Key fields: marque, gamme, vitole_nom, prix, terroir, puissance, module

## 3rd Party Integrations
- **OpenAI** via Emergent LLM Key (Winston chat)
- **OVH CloudDB MySQL** - External cigar database

## Test Credentials
- Login: `fabien.lanfranchi@yahoo.fr` / `fabienlabague1`
- Or use "Accès direct (Président)" bypass button

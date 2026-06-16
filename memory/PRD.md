# PRD — La Bague Impériale (Application de gestion du club de cigares)

## Original problem statement
Application full-stack (React + FastAPI + MongoDB) pour gérer le club de cigares "La Bague Impériale".

## Personas
- **Président** (Fabien Lanfranchi) : admin complet
- **Trésorier** (Jacques Peretti) : gestion compta
- **Membres** : consultation, sondages, présences
- **Invités** : visibilité limitée

## Modules
- Authentification par clé (login_key) → JWT Bearer (`localStorage.lbi_access_token`)
- Gestion des **événements** (apéros, repas, anniversaires) + sondages de présence
- Gestion des **présences** par saison (S1→S20)
- Gestion **comptabilité** (transactions, factures, dettes, comptes/caisses)
- Gestion **membres** + cotisations
- **Statistiques** par saison + globales
- **Boutique** (albums, tombolas), Cigarothèque, Messages, Sondages
- **IA Winston** (OpenAI via Emergent LLM Key)

## Implémenté cette session (Feb 2026)
- [16/06/2026] **Filtre "Mouvements" enrichi en Comptabilité** :
  - Option "Invité (sans membre)" dans filtre Membre
  - Nouveau filtre "Mode de paiement" (Espèces / Virement / Chèque / CB)
  - Nouveau champ "Mode de paiement" dans formulaire d'ajout
  - Nouvelle colonne "Mode" dans tableau des mouvements
  - Backend : `mode_paiement: Optional[str]` ajouté à `Transaction` + `TransactionCreate`
- [16/06/2026] **Nettoyage des doublons Caisse** :
  - Migration DB : `transactions.endroit = "Compte"` → `"Compte Bancaire"`
  - `caisseOptions` du frontend basé sur la liste officielle `comptes` (plus de doublons)
- [16/06/2026] **Paiement fractionné des factures** :
  - Mode de paiement par ligne de répartition (ex: 500€ CB + 4300€ Espèces)
  - Paiement partiel autorisé sur factures sans lignes (somme < total → statut "partielle")
  - Historique des paiements dans `FactureAPayer.paiements`
  - Testé E2E backend : facture 4800€ → 2 paiements (500€ + 4300€) → statut "payee"
- [16/06/2026] **Verrouillage de saison via UI** :
  - Endpoint `PUT /api/saisons-config/{saison}` accepte `is_manuel: bool`
  - Bouton "Verrouiller cette saison" dans Statistiques (couleur dynamique : vert si déverrouillée, rouge si verrouillée)
  - S13 verrouillée sur Preview ce jour

## Architecture
- Backend monolithique : `/app/backend/server.py` (~8500 lignes)
- Frontend pages : `/app/frontend/src/pages/{Dashboard,Comptabilite,Membres,Statistiques,...}.js`
- DB MongoDB : `evenements`, `presences_membres`, `reponses_manuelles`, `members`, `transactions`, `factures_a_payer`, `comptes`, `dettes`, `saisons_config`

## Backlog / Roadmap
### P1
- [P1] **Étendre la sauvegarde Excel pour inclure les cotisations** (`situation_cotisation`, `cotisations_offertes`) + transactions, sinon Preview/Prod restent désynchronisés sur ce point
- [P1] **Envoi automatique de la sauvegarde Excel par email** (dimanche soir) au Président + Trésorier
- [P1] **Restauration "miroir intelligente"** : supprimer les events présents en cible mais absents du fichier importé

### P2
- [P2] Refactor : extraire les routes de `/app/backend/server.py` vers `/app/backend/routes/`
- [P2] Refactor : découper `/app/frontend/src/pages/Dashboard.js`

## Tech stack
- **Backend** : FastAPI, Motor (MongoDB async), Pydantic v2, pandas + openpyxl (Excel)
- **Frontend** : React, Shadcn UI, lucide-react, sonner (toasts), recharts
- **Auth** : JWT Bearer (cookies refusés)
- **3rd party** : OpenAI GPT via Emergent LLM Key (Winston)

## Test credentials
- Président : clé `labague1` (Fabien Lanfranchi)
- Trésorier : clé `labague2` (Jacques Peretti)

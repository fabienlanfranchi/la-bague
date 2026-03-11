# La Bague Impériale - Club de Cigares - PRD

## Original Problem Statement
Application de gestion complète pour le club de cigares "La Bague Impériale" avec gestion des membres, événements, statistiques, comptabilité, catalogue cigares et assistant IA.

## What's Been Implemented

### Session 11 Mars 2026 - Mise à jour 2

**Normalisation des marques (TERMINÉ) :**
- Les marques "LIGNE XXX" sont maintenant correctement affichées :
  - "LIGNE BEHIKE" → **COHIBA** (marque) + "Ligne Behike" (sous-ligne)
  - "LIGNE CHURCHILL" → **ROMEO Y JULIETA** + "Ligne Churchill"
  - "LIGNE EDMUNDO" → **MONTECRISTO** + "Ligne Edmundo"
- Le filtre "Marque" affiche les vraies marques (pas les LIGNE)

**Bouton Toggle Apéro du Club (TERMINÉ) :**
- Un seul bouton en bas à droite des cartes de cigares (icône verre de vin)
- **Grisé** = le cigare n'est PAS dans l'Apéro du Club
- **Rouge** = le cigare EST dans l'Apéro du Club  
- Clic sur le bouton = toggle avec **confirmation** ("Ajouter X à l'Apéro du Club ?" ou "Retirer X de l'Apéro du Club ?")
- Le même comportement est présent dans la modal de détail
- Les marques normalisées sont utilisées lors de l'ajout à l'Apéro

**Comparateur de Cigares (TERMINÉ) :**
- Bouton "Comparateur de cigares" en haut de la page (icône balance)
- Mode sélection : cliquez sur 2 cigares pour les comparer
- Les cigares sélectionnés s'affichent avec un badge violet "Comparateur"
- Vue comparaison côte à côte avec :
  - Photos des deux cigares
  - Note, Prix, Puissance, Origine
  - Dimensions (mm, cepo, diamètre)
  - Composition (Cape, Sous-cape, Tripe)
  - Conclusion
- Possibilité de changer les cigares ou d'effacer la comparaison

### Session 11 Mars 2026

**Cigarthèque - Refonte complète selon les rôles :**

#### Vue Admin (Président) - 2 onglets :
- **Catalogue** : 657 cigares avec recherche et filtres (Marque, Pays, Puissance, Module, Prix)
  - Bouton "Modifier" (crayon bleu) → Modal d'édition avec tous les champs + **bouton Supprimer**
  - Bouton "Apéro" (verre bordeaux) → Ajoute le cigare à l'Apéro du Club
  - Bouton "Copier" → Format prêt à coller dans un événement Apéro
  - **Badge "verre de rouge"** sur les cigares déjà dans l'Apéro
- **Apéro du Club** : Gestion complète (ajouter/supprimer) des cigares fumés lors des événements

#### Vue Membre - 3 onglets :
- **Catalogue** : Consultation + bouton "+" pour importer vers Ma Cigarthèque
- **Apéro du Club** : Consultation + bouton "Copier vers Ma Cigarthèque"
- **Ma Cigarthèque** : Collection personnelle avec :
  - **Filtres** : Recherche, Terroir (pays), Marque, Module
  - **Tri** : Par Terroir, Par Marque, Par Module (avec groupement visuel)
  - **Bouton "Ajouter un cigare"** → Recherche dans le catalogue (remplace "Fiche vierge")
  - **Notation guidée** :
    - Note globale (sur 5)
    - Puissance ressentie (sur 5)
    - Caractère : Évolutif ou Linéaire
    - Notes libres

**Note importante** : Certaines conclusions de cigares sont tronquées dans la base MySQL source (ex: "Résolument puiss" au lieu de "Résolument puissant"). Ce problème vient de la base originale.

**APIs implémentées :**
- `PUT /api/cigares/{id}` - Modifier un cigare MySQL (admin)
- `DELETE /api/cigares/{id}` - Supprimer un cigare du catalogue MySQL (admin)
- `GET/POST/DELETE /api/ma-cigarotheque` - Collection personnelle membre
- `PUT /api/ma-cigarotheque/{id}?note=X&commentaire=Y` - Noter un cigare
- `GET/POST/DELETE /api/apero-club` - Cigares de l'Apéro du Club

### Session 10 Mars 2026 (Précédente)

**Système de connexion membre:**
- Page de login avec activation par code `labagueimperialeXX`
- Validation du compte (email + mot de passe)
- "Rester connecté" et "Mot de passe oublié"
- Conseil de mot de passe: `prenom + numéro`

**Catalogue Cigares (MySQL OVH):**
- Connexion à la base OVH (gb60402-001.eu.clouddb.ovh.net:35741)
- 657 cigares avec recherche et filtres
- Fiches détaillées avec notes de dégustation

**Améliorations UI:**
- Tailles de texte augmentées (lisibilité)
- Boutons "Copier" sur les messages
- 2 liens WhatsApp (Membres + Bureau)

**Comptabilité:**
- Données nettoyées (899€ Compte, 632€ PayPal)
- Transaction abonnement Asso Connect (336€)

**Sondages:**
- Système complet avec persistance MongoDB

## Prioritized Backlog

### P0 - Terminé ✅
- [x] Fonction "Modifier" cigare (admin) - Modal complet avec tous les champs
- [x] Fonction "Supprimer" cigare (admin) - Bouton dans le modal d'édition
- [x] **Affichage des photos** - Photos sur les cartes et dans le modal de détail
- [x] Structure des onglets selon le rôle (admin vs membre)
- [x] Importateur de cigares vers Ma Cigarthèque
- [x] Système de notation et commentaires personnels
- [x] **Normalisation des marques** - LIGNE XXX → Vraie marque + sous-ligne
- [x] **Badge Apéro du Club** - Verre de rouge sur les cigares dans l'Apéro

### P1 - À faire
- [ ] Nouvelles fonctionnalités "Ma Cigarthèque" :
  - Tri/Filtres avancés (terroir, marque, module) - déjà partiellement fait
  - Changer "Fiche Vierge" → "Importer" avec modal de recherche - fait
  - Notation guidée : Note (sur 5), Puissance (sur 5), Évolution/Linéaire, Note libre - fait
- [ ] Fonctionnalité "Copier" depuis Apéro du Club vers messages événements
- [ ] Assistant IA Claude (playbook disponible)
- [ ] Refonte page Messages admin

### P2 - Future
- [ ] Notifications admin détaillées
- [ ] Page Instagram
- [ ] Envoi email (mot de passe oublié)
- [ ] Réactiver l'authentification (quand demandé)

## Technical Details

### Base de données Cigares (MySQL OVH)
- Host: gb60402-001.eu.clouddb.ovh.net
- Port: 35741
- User: cigare20
- Database: CIGARE
- Table: cigares (657 entrées)
- Colonne photo: `./photos_cigares/...` → URL complète: `https://51.68.122.192/cigares/photos_cigares/...`
- ~650 cigares ont une photo (préfixes: `cig1004_` pour Cigaroscope, `hav1005_` pour Havanoscope)

### Comptes Admin
- Fabien Lanfranchi (n°1): fabienlanfranchi@yahoo.fr / fabienlanfranchi01
- ID: d6b30499-2c9b-43e4-9402-7234da4c9855

### Codes d'activation membres
Format: labagueimperialeXX (XX = numéro membre)

## Key API Endpoints
- `GET /api/cigares` - Catalogue avec filtres et pagination
- `GET /api/cigares-filtres` - Options de filtres
- `PUT /api/cigares/{id}` - Modifier un cigare (admin)
- `GET/POST/DELETE /api/ma-cigarotheque/{membre_id}` - Collection personnelle
- `PUT /api/ma-cigarotheque/{cigare_id}` - Noter un cigare
- `GET/POST/DELETE /api/apero-club` - Cigares apéro club
- `POST /api/auth/login` - Connexion
- `POST /api/auth/validate-account` - Activer compte

## Files Modified This Session
- `/app/frontend/src/pages/Cigarotheque.js` - Refonte complète avec onglets selon rôle
- `/app/backend/server.py` - Modèles CigarePersonnel et AperoClubCigare enrichis

## Tests Passés
- `/app/test_reports/iteration_3.json` - 100% réussite (17/17 tests backend, 100% frontend)

## Questions en attente
1. URL du serveur PHP pour les photos de cigares ?
2. Intégration email (SendGrid/Resend/Gmail) ?
3. Quand réactiver l'authentification ?

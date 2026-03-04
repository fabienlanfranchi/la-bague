# La Bague Impériale - PRD

## Application
Gestion d'un club de cigares avec 35 membres.

## Fonctionnalités implémentées

### Statistiques de présences (COMPLET - Mis à jour 04/03/2026)
- **Saisie par saison** : Tableau pour entrer présences (Apéros, Repas, Anniversaires)
- **Stats Membres** : Vue globale triable par colonne avec % de présence
- **Stats Saisons** : **MOYENNES de présences par événement** avec TOGGLE Tableau/Graphique
  - **Mode Tableau** :
    - Colonnes : Saison | Nb Membres | Apéros (Prés./Moy.) | Repas (Prés./Moy.) | Anniv. (Prés./Moy.) | Moy. Globale
    - Saisons 1-12 : Saisie manuelle des présences totales
    - Saisons 13+ : Calcul automatique depuis les données de présence membres
  - **Mode Graphique** :
    - Graphique linéaire : Évolution des moyennes par type d'événement
    - Graphique barres : Comparaison par saison (Apéros, Repas, Anniv.)
    - Graphique barres : Évolution du nombre de membres
- **Dashboard** : Statistiques calculées depuis les données historiques (Stats Saisons)
  - % Global = Total présences / (Σ événements × membres par saison) × 100
  - Moyenne par événement + Moyenne Repas spécifique
  - Pour Global ET Saison en cours
- **Profil membre** : Tableau simplifié Saison | Présences/Événements | % (cliquable)
- **Automatisation complète** : % et étoiles calculés automatiquement

### Endpoints API Statistiques
- `GET /api/statistiques/saisons-resume` : Stats par saison avec moyennes
- `GET /api/statistiques/moyennes-dashboard` : % global, moyennes, stats saison actuelle
- `POST /api/saisons-config/{saison}/manual-stats` : Sauvegarde données manuelles

### Membres
- CRUD complet avec contrôle admin total
- Étoiles automatiques selon % (4★ ≥75%, 3★ ≥50%, 2★ ≥25%, 1★ <25%)

### Messages & Sondages
- Envoi de messages/sondages aux membres
- Réponses automatisent les présences

### Sauvegarde
- Export/Import JSON complet

## Saison en cours : 13 (jusqu'à juillet)

## Prochaines tâches
- Notifications admin détaillées
- Voir qui a voté aux sondages
- Onglets: Jeux, Boutique, Cigarothèque, Assistant IA

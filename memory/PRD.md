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
    - Bouton de sauvegarde par ligne pour les saisons historiques
  - **Mode Graphique** :
    - Graphique linéaire : Évolution des moyennes par type d'événement
    - Graphique barres : Comparaison par saison (Apéros, Repas, Anniv.)
    - Graphique barres : Évolution du nombre de membres
- **Dashboard** : Affiche % ET moyennes de présences (présents/évén.)
- **Profil membre** : Tableau simplifié Saison | Présences/Événements | % (cliquable)
- **Automatisation complète** : % et étoiles calculés automatiquement
- **Règles** : Saisons exclues pour membres en sommeil, première saison selon année d'entrée
- **Arrondi personnalisé** : 0.1-0.4 → inférieur, 0.5 → garde, 0.6-0.9 → supérieur

### Endpoints API Statistiques
- `GET /api/statistiques/saisons-resume` : Stats par saison avec moyennes
- `GET /api/statistiques/moyennes-dashboard` : Moyennes globale et saison actuelle
- `POST /api/saisons-config/{saison}/manual-stats` : Sauvegarde données manuelles

### Membres
- CRUD complet avec contrôle admin total
- Saisons exclues (Jean Jacques Leca & Mathias Lanfranchi : S5, S6, S7)
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

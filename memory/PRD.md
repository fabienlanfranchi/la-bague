# La Bague Impériale - PRD

## Application
Gestion d'un club de cigares avec 35 membres.

## Fonctionnalités implémentées

### Dashboard Membre (Mis à jour 04/03/2026)
- **Stats perso Saison 13** : % global + détail Apéros/Repas/Anniversaires avec étoiles
- **Messages non lus** : Affichés en haut avec pastille rouge, disparaissent quand lus (clic ouvre modal)
- **Sondage en cours** : Réponse OUI/NON avec date limite
- **Menu "Messages" masqué** pour les membres (admin only)

### Statistiques de présences (COMPLET)
- **Stats Saisons** : MOYENNES avec toggle Tableau/Graphique
- **Calcul % global** basé sur données historiques (nb membres par saison)
- **Dashboard Admin** : % + moyennes + moyenne repas (global et saison)

### Endpoints API Statistiques
- `GET /api/statistiques/saisons-resume` : Stats par saison avec moyennes
- `GET /api/statistiques/moyennes-dashboard` : % global, moyennes, stats saison actuelle
- `POST /api/saisons-config/{saison}/manual-stats` : Sauvegarde données manuelles

### Membres
- CRUD complet avec contrôle admin total
- Étoiles automatiques selon % (4★ ≥75%, 3★ ≥50%, 2★ ≥25%, 1★ <25%)

### Messages & Sondages
- Admin : Envoi de messages/sondages
- Membre : Messages non lus dans Dashboard (pas d'onglet séparé)
- Réponses sondages automatisent les présences en temps réel

### Sauvegarde
- Export/Import JSON complet

## Saison en cours : 13 (jusqu'à juillet)

## Prochaines tâches
- Notifications admin détaillées
- Voir qui a voté aux sondages
- Onglets: Jeux, Boutique, Cigarothèque, Assistant IA

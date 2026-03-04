# La Bague Impériale - PRD

## Application
Gestion d'un club de cigares avec 35 membres.

## Fonctionnalités implémentées

### Statistiques de présences (COMPLET)
- **Saisie par saison** : Tableau pour entrer présences (Apéros, Repas, Anniversaires)
- **Stats Membres** : Vue globale triable par colonne
- **Stats Saisons** : % de présence moyen par saison/type
- **Profil membre** : Tableau simplifié Saison | Présences/Événements | % (cliquable)
- **Automatisation complète** : % et étoiles calculés automatiquement
- **Règles** : Saisons exclues pour membres en sommeil, première saison selon année d'entrée
- **Arrondi personnalisé** : 0.1-0.4 → inférieur, 0.5 → garde, 0.6-0.9 → supérieur

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

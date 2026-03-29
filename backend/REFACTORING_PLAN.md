# Plan de refactorisation de server.py
# La Bague Impériale - Backend

## État actuel
- server.py : 6472 lignes
- Contient TOUS les endpoints et la logique métier

## Structure cible

```
/backend/
├── server.py              # App principal, imports et configuration (~200 lignes)
├── database.py            # Connexions MongoDB et MySQL
├── models.py              # Tous les modèles Pydantic
├── routes/
│   ├── __init__.py
│   ├── auth.py            # Authentification, login, mots de passe (~400 lignes)
│   ├── members.py         # Gestion des 35 membres (~300 lignes)
│   ├── cigares.py         # Catalogue cigares MySQL (~1500 lignes)
│   ├── evenements.py      # Événements et présences (~800 lignes)
│   ├── comptabilite.py    # Comptes, transactions, dettes (~600 lignes)
│   ├── sondages.py        # Sondages et votes (~400 lignes)
│   ├── messages.py        # Messagerie du club (~300 lignes)
│   ├── stats.py           # Statistiques (~200 lignes)
│   ├── winston.py         # Assistant IA (~500 lignes)
│   └── export.py          # Import/export données (~200 lignes)
```

## Ordre de refactorisation recommandé

1. ✅ Créer database.py (connexions DB)
2. ✅ Créer models.py (modèles Pydantic)
3. ✅ Extraire routes/winston.py (IA - 512 lignes extraites)
4. ⏳ Extraire routes/auth.py
5. ⏳ Extraire routes/members.py
6. ⏳ Extraire routes/cigares.py
7. ⏳ Etc.

## Progression
- server.py: 6472 → 5960 lignes (-512 lignes, -8%)
- Nouveau fichier: routes/winston.py (~350 lignes utiles)

## Notes
- Chaque extraction doit être testée individuellement
- Garder les imports relatifs cohérents
- Ne pas oublier les dépendances circulaires potentielles

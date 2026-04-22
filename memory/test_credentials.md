# Test Credentials - La Bague Impériale

## Authentification
Login via clé d'activation au format `labague{numero_membre}`

## Comptes de test

| Rôle | Nom | Clé d'activation | Numéro |
|------|-----|------------------|--------|
| Président (Admin) | Fabien Lanfranchi | `labague1` | 1 |
| Trésorier (Membre) | Jacques Peretti | `labague3` | 3 |
| Membre | Pascal Giovachini | `labague23` | 23 |
| Membre | Jean Michel Versini | `labague72` | 72 |

## Endpoints Auth (JWT - nouvelle architecture)

- `POST /api/auth/key-login` → pose cookie `lbi_session` (JWT httpOnly, secure, sameSite=Lax, 30j)
- `POST /api/auth/device-login` → pose cookie JWT via device_token mémorisé
- `GET /api/auth/me` → retourne `{success, member}` si JWT valide, sinon 401
- `POST /api/auth/logout-jwt` → efface cookie JWT
- `POST /api/auth/remove-device` → révoque le device_token côté serveur

## Notes sécurité

- Le cookie JWT `lbi_session` est la **source de vérité** de l'identité
- Le frontend valide systématiquement via `/api/auth/me` au démarrage
- En cas de mismatch cookie / localStorage → purge automatique
- Tokens purgés le 22 avr 2026 pour Pascal (23) et Jean Michel (72) suite à incident de contamination

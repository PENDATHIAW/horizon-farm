# Mobile money — Wave & Orange Money

Variables d'environnement Vercel (serveur) :

| Variable | Description |
|----------|-------------|
| `WAVE_API_KEY` | Clé API Wave Business |
| `WAVE_MERCHANT_ID` | Identifiant marchand Wave |
| `WAVE_API_BASE` | Optionnel — défaut `https://api.wave.com` |
| `ORANGE_MONEY_API_KEY` | Clé API Orange Money Web Payment |
| `ORANGE_MONEY_MERCHANT_CODE` | Code marchand OM |
| `ORANGE_MONEY_API_BASE` | Optionnel |
| `MOBILE_MONEY_SANDBOX` | `true` pour forcer simulation |
| `VITE_APP_URL` | URL publique app (return URLs) |

## Endpoints

- `POST /api/mobile-money/create-link` — body: `{ order_id, amount, provider: wave|orange_money, client_phone }`
- `GET /api/mobile-money/status?ref=WAVE-...`
- `POST /api/mobile-money/simulate-confirm` — body: `{ ref }` (sandbox / tests)
- `POST /api/mobile-money/webhook` — callbacks Wave / Orange Money

## Flux ERP

1. Commercial → vente → Encaisser → Wave/OM → **Envoyer lien de paiement**
2. Client paie sur Wave/OM (ou simulation)
3. Webhook ou **Vérifier paiement** / **Confirmer simulation**
4. `recordSalePayment` → Finance + créances client

Sans clés API : mode simulation automatique.

# Mobile money — Wave & Orange Money

Variables d'environnement Vercel (serveur) :

| Variable | Description |
|----------|-------------|
| `WAVE_API_KEY` | Clé API Wave Business |
| `WAVE_API_SIGNING_SECRET` | Secret de signature des appels, si cette option est activée sur la clé Wave |
| `WAVE_WEBHOOK_SECRET` | Secret de signature remis lors de l'enregistrement du retour Wave |
| `WAVE_MERCHANT_ID` | Identifiant marchand Wave |
| `WAVE_API_BASE` | Optionnel — défaut `https://api.wave.com` |
| `ORANGE_MONEY_API_KEY` | Clé API Orange Money Web Payment |
| `ORANGE_MONEY_WEBHOOK_SECRET` | Secret partagé prévu dans le contrat Orange Money |
| `ORANGE_MONEY_MERCHANT_CODE` | Code marchand OM |
| `ORANGE_MONEY_API_BASE` | Optionnel |
| `MOBILE_MONEY_SANDBOX` | `true` pour forcer simulation |
| `VITE_APP_URL` | URL publique app (return URLs) |
| `SUPABASE_SERVICE_ROLE_KEY` | Enregistrement serveur des paiements confirmés |

## Endpoints

- `POST /api/mobile-money/create-link` — body: `{ order_id, amount, provider: wave|orange_money, client_phone }`
- `GET /api/mobile-money/status?ref=WAVE-...`
- `POST /api/mobile-money/simulate-confirm` — body: `{ ref }` (sandbox / tests)
- `POST /api/mobile-money/webhook` — callbacks Wave / Orange Money

## Flux ERP

1. Commercial → vente → Encaisser → Wave/OM → **Envoyer lien de paiement**
2. Client paie sur Wave/OM (ou simulation)
3. Wave ou Orange Money confirme la réception
4. Le paiement, la vente et le compte concerné sont mis à jour ensemble

Sans clés de paiement : mode test automatique. Sans secret de confirmation ou
sans `SUPABASE_SERVICE_ROLE_KEY`, aucun encaissement réel n'est validé.

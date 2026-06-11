# ASSISTANT_COVERAGE_GAPS

**Version :** V5  
**Date :** 2026-06-09

## Questions encore partielles

| Question | Statut | Cause |
|----------|--------|-------|
| Quels devis en attente ? | non couvert | Commercial V1 gelé — pas de détecteur devis |
| Livraisons du jour (preset) | non couvert | Idem — hors `detectCommercialPilotageQuery` |
| DLC détaillée par produit | orientation module | Pas de moteur DLC dédié |
| Performance parcelle nominative | partiel | Carnet headline, pas classement parcelle nominatif |
| RH / équipe terrain | non couvert | Pas de lecteur canonique RH dans assistant |

## Modules mal couverts

| Module | Score | Action V5+ |
|--------|-------|------------|
| Documents & Rapports | 10 % | Navigation uniquement |
| Opérations & Ressources | 15 % | Navigation + alias RH |
| Activité & Sync ERP | 20 % | Pas de Q&R métier |
| Centre décisionnel | 45 % | Redirection + priorités carnet |

## Intentions ambiguës

| Phrase | Risque | Mitigation V5 |
|--------|--------|---------------|
| « client » seul | commercial vs navigation | Contexte conversationnel |
| « stock » dans une vente | stock vs déclaration | Priorité sémantique question |
| « objectif » | mois vs année | Patterns `annual_outlook` dédiés |

## Données non accessibles (sans nouveau moteur)

- Classement parcelle nominatif détaillé
- Devis / livraisons / abonnements commercial avancés
- Capteurs Smart Farm temps réel
- Journaux RH nominatifs

## Corrections V5 livrées

- Matcher sémantique (tokens + synonymes) — fin des `includes()` seuls
- Mémoire métier multi-domaines
- Synthèse « Comment va la ferme ? »
- Bug UI conversation (messages effacés)

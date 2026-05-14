# Horizon Farm — Workflow Assistant ERP Horizon

## Objectif

Transformer l'Assistant ERP en assistant conversationnel intelligent appele Horizon, capable de comprendre une commande naturelle, preparer les saisies ERP, afficher le formulaire concerne et executer uniquement apres validation humaine.

## Regle capitale

Horizon ne doit jamais dire "necessaire fait" avant validation.

L'IA prepare. L'humain valide. L'ERP execute.

## Workflow cible

### 1. Commande utilisateur

Exemple :

> Hey Horizon, enregistre un achat de 20 sacs d'aliment de 50 kg chacun chez le fournisseur NMA Sanders. Le paiement est effectif et la date est le 19 mai 2026.

### 2. Interpretation IA

Horizon extrait les informations :

- intention : achat stock ;
- produit : aliment ;
- quantite : 20 ;
- unite : sacs ;
- poids unitaire : 50 kg ;
- fournisseur : NMA Sanders ;
- paiement : effectif ;
- date : 19/05/2026 ;
- modules concernes : stock, finances, fournisseurs, tracabilite, IA marche.

### 3. Verification intelligente

Horizon verifie :

- fournisseur existe-t-il ?
- produit existe-t-il deja en stock ?
- un prix est-il disponible ?
- la date est-elle valide ?
- le paiement doit-il creer une depense finance ?
- y a-t-il un doublon possible ?
- quelles interconnexions seront impactees ?

### 4. Affichage formulaire pre-rempli

Horizon doit ouvrir automatiquement :

- soit le formulaire du module concerne ;
- soit une section de validation intelligente dediee ;
- soit un panneau lateral Assistant ERP avec le formulaire pre-rempli.

L'utilisateur doit pouvoir :

- modifier les champs ;
- corriger fournisseur ;
- ajouter prix ;
- changer date ;
- changer paiement ;
- annuler ;
- valider.

### 5. Validation utilisateur

Boutons :

- Valider l'enregistrement ;
- Modifier ;
- Annuler.

Tant que l'utilisateur n'a pas valide, aucune ecriture sensible ne doit etre faite.

### 6. Execution ERP apres validation

Apres validation seulement, Horizon execute :

- Stock : entree stock ;
- Finances : depense payee ;
- Fournisseurs : historique achat / relation ;
- Tracabilite : journal evenement ;
- IA marche : prix observe si prix renseigne ;
- Alertes : recalcul autonomie stock.

### 7. Message final apres execution

Apres execution reussie, Horizon affiche :

> Necessaire fait.
>
> Modules mis a jour :
> - Stock : entree de 20 sacs d'aliment ;
> - Finances : depense enregistree ;
> - Fournisseurs : historique NMA Sanders mis a jour ;
> - Tracabilite : evenement journalise ;
> - Centre IA : donnees disponibles pour analyse.

Important : ce message est informatif. Il ne demande plus de confirmation.

## Difference entre validation et confirmation

### Validation

Avant execution.

L'utilisateur valide les donnees pre-remplies.

### Confirmation informative

Apres execution.

Horizon explique ce qui a ete mis a jour.

Il ne faut pas redemander confirmation apres avoir dit "necessaire fait".

## Etats techniques recommandes

| Etat | Description |
|---|---|
| interpreted | La commande est comprise |
| draft_ready | Le formulaire pre-rempli est pret |
| awaiting_validation | En attente validation utilisateur |
| validated | Utilisateur a valide |
| executing | Ecritures ERP en cours |
| completed | Necessaire fait |
| cancelled | Annule par utilisateur |
| failed | Erreur execution |

## Structure d'une intention IA

```json
{
  "intent": "purchase_stock",
  "confidence": 0.86,
  "raw_input": "Hey Horizon, enregistre un achat de 20 sacs...",
  "primary_module": "stock",
  "fields": {
    "product_name": "aliment",
    "quantity": 20,
    "unit": "sac",
    "unit_weight_kg": 50,
    "supplier_name": "NMA Sanders",
    "payment_status": "paid",
    "date": "2026-05-19"
  },
  "impacted_modules": ["stock", "finances", "fournisseurs", "tracabilite", "centre_ia"],
  "requires_validation": true
}
```

## Structure d'un plan d'action

```json
{
  "status": "awaiting_validation",
  "primary_module": "stock",
  "form_type": "stock_purchase",
  "draft_fields": {},
  "proposed_actions": [
    { "module": "stock", "action": "create_stock_entry" },
    { "module": "finances", "action": "create_expense" },
    { "module": "fournisseurs", "action": "link_supplier_history" },
    { "module": "tracabilite", "action": "create_business_event" }
  ]
}
```

## Regle anti-duplication

Horizon ne cree pas un nouveau module de saisie metier.

Il orchestre les formulaires existants et les services existants :

- Stock reste proprietaire des entrees stock ;
- Finances reste proprietaire des depenses ;
- Fournisseurs reste proprietaire des fournisseurs ;
- Tracabilite reste proprietaire des evenements ;
- Centre IA lit et analyse.

## Priorite MVP

Implementer d'abord le cas : achat aliment.

Phrase cible :

> Enregistre un achat de 20 sacs d'aliment de 50 kg chez NMA Sanders, paiement effectif, date 19 mai 2026.

Le MVP doit :

1. comprendre la phrase ;
2. pre-remplir un formulaire ;
3. afficher les modules impactes ;
4. attendre validation ;
5. executer apres validation ;
6. afficher "necessaire fait" et les modules mis a jour.

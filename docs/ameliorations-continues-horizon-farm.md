# Améliorations continues — Horizon Farm

Ce fichier sert de **mémoire de revue continue** pour le chantier Horizon Farm.

Objectif : aider à avancer module par module sans perdre le cap produit :

```txt
Moins de saisie utilisateur.
Plus d’interconnexions automatiques.
Modules riches mais simples à utiliser.
Prévisualisation avant validation.
Anti-doublon.
Audit et traçabilité.
Cohérence fonctionnelle réelle.
```

---

## Comment utiliser ce fichier

À chaque nouvelle session de développement, lire ce fichier avant de coder.

Puis :

1. Identifier le bloc en cours.
2. Vérifier les règles UX, qualité et architecture ci-dessous.
3. Ajouter ou mettre à jour la section `Journal des avancées`.
4. Ajouter les nouveaux points d’amélioration détectés.
5. Ne pas supprimer les anciennes remarques sans les marquer comme traitées.

Statuts recommandés :

```txt
[À faire]
[En cours]
[À tester]
[Traité]
[À revoir]
[Reporté]
```

---

## Vision produit non négociable

Horizon Farm ne doit pas devenir une collection de formulaires séparés.

L’utilisateur doit déclarer une action métier réelle :

```txt
J’ai vendu.
J’ai encaissé.
J’ai reçu du stock.
J’ai soigné.
J’ai récolté.
J’ai payé un fournisseur.
J’ai constaté une panne.
J’ai détecté un risque sanitaire.
```

Puis l’ERP doit proposer les effets liés :

```txt
finance
documents
stock
client/fournisseur
alertes
tâches
traçabilité
audit
impact business
```

---

## Règle UX centrale

```txt
L’ERP propose.
L’utilisateur confirme ou corrige.
L’ERP écrit dans les modules liés.
La traçabilité garde la preuve.
```

À appliquer partout :

- Badge `Auto` pour les valeurs calculées.
- Badge `Modifié` pour les corrections humaines.
- Les champs connus ne doivent pas être redemandés.
- Aucune correction utilisateur ne doit être écrasée silencieusement.
- Les actions importantes doivent avoir une prévisualisation avant commit.
- Les workflows doivent afficher le nombre de `saisies_evitees` quand possible.

---

## Définition de terminé : cohérence fonctionnelle obligatoire

Une fonctionnalité n’est pas terminée parce qu’elle s’affiche dans l’interface.

Elle est terminée seulement quand elle est :

```txt
cohérente,
testable,
interconnectée,
utilisable,
sans message technique visible,
et vérifiable dans les modules liés.
```

Avant de marquer un bloc `[Traité]`, vérifier obligatoirement :

- [ ] aucune erreur visible côté utilisateur ;
- [ ] pas de commentaire technique ou brouillon métier dans l’ERP ;
- [ ] les messages utilisateur sont courts, clairs et métier ;
- [ ] les listes déroulantes sont filtrées selon les vraies entités disponibles ;
- [ ] les modules sans entité valide ne sont pas proposés comme choix actif ;
- [ ] les champs dépendants se remplissent ou se réinitialisent correctement ;
- [ ] les champs liés ne restent pas vides après sélection ;
- [ ] les interconnexions visibles mettent réellement à jour les modules liés ;
- [ ] les statuts restent cohérents, séparés et non contradictoires ;
- [ ] pas de doublons après double clic, refresh ou revalidation ;
- [ ] les actions importantes sont testables depuis l’UI sans manipulation technique.

Exemple de règle :

```txt
Si une liste déroulante propose “Animaux”, alors il doit exister au moins un animal valide.
Si aucun animal valide n’existe, “Animaux” ne doit pas être proposé comme choix actif.
Si l’utilisateur choisit un animal, les champs animal_id / related_id / module_lie / résumé cible doivent être remplis ou réinitialisés proprement.
```

Points spécifiques à contrôler :

```txt
Sélecteurs module/cible
→ filtrer selon les entités réellement disponibles.

Champs dépendants
→ remplir automatiquement ou vider explicitement quand le choix parent change.

Interconnexions
→ vérifier dans le module cible : finance, stock, santé, client, fournisseur, tâche, alerte, document, trace.

Statuts
→ ne jamais mélanger statut facture, statut paiement, statut commande et statut livraison.

Messages
→ jamais d’erreur Supabase, stack technique, commentaire développeur ou phrase métier longue non utile.
```

---

## Architecture cible recommandée

Éviter de disperser la logique métier directement dans les composants React.

Préférer ce modèle :

```txt
prepareWorkflow(payload, context)
→ preview avec valeurs auto
→ correction humaine possible
→ commitWorkflow(preview, handlers)
→ écritures multi-modules
→ audit / business_event / workflow_run
```

À terme, centraliser progressivement dans :

```txt
src/services/workflowService.js
src/services/financeSyncService.js
src/services/workflowEngine.js
src/services/workflowDedupe.js
src/services/workflowAudit.js
src/services/offlineQueueService.js
```

---

## Point d’attention majeur

Plusieurs modules créent déjà directement des enregistrements liés depuis les composants.

C’est acceptable temporairement, mais à stabiliser ensuite.

Exemples à surveiller :

```txt
AnimalHealthBridge.jsx
AvicoleHealthBridge.jsx
StockFlowPanel.jsx
Fournisseurs.jsx
Clients.jsx
CulturesWorkflowBridge.jsx
```

Objectif final : ces composants doivent surtout appeler des workflows centralisés.

---

## Anti-doublon transversal

Chaque workflow qui crée plusieurs éléments doit éviter les doublons.

Clé métier recommandée :

```txt
dedupe_key = workflow_type + source_module + source_record_id + target_module + target_action
```

Exemples :

```txt
sale_payment:ventes:CMD-123:finance:create
sale_payment:ventes:CMD-123:document:invoice
stock_receipt:stock:STK-12:fournisseur:debt
animal_health:animaux:ANI-44:tache:controle
culture_harvest:cultures:CUL-12:stock:create
culture_risk:cultures:CUL-12:alert:create
```

À vérifier :

- pas de double facture ;
- pas de double paiement ;
- pas de double transaction finance ;
- pas de double dette fournisseur ;
- pas de double alerte ;
- pas de double tâche ;
- pas de double business event ;
- pas de double stock récolte pour une même culture/récolte.

---

## Table ou structure recommandée : workflow_runs

À créer ou simuler progressivement.

```txt
workflow_runs
- id
- workflow_type
- source_module
- source_record_id
- status: prepared / committed / failed / cancelled
- started_at
- committed_at
- user_id
- saisies_utilisateur
- actions_erp
- saisies_evitees
- preview_payload
- committed_records
- error_message
```

Cette structure permettra ensuite :

- Impact Business fiable ;
- audit des automatisations ;
- reprise offline ;
- débogage des erreurs ;
- mesure du gain réel de saisie.

---

## Blocs déjà bien avancés

### 1. Ventes / Paiements / Factures

Objectif : une vente ou un encaissement doit alimenter automatiquement paiement, facture, finance, client, stock/source, document, traçabilité et alerte créance si nécessaire.

À vérifier :

- [ ] commande soldée absente de la liste d’encaissement ;
- [ ] paiement partiel correct ;
- [ ] paiement total correct ;
- [ ] facture séparée du statut paiement ;
- [ ] anti-doublon paiement/facture/finance ;
- [ ] mise à jour client cohérente ;
- [ ] source vendue décrémentée ou mise à jour ;
- [À revoir] vérifier que les boutons facture/paiement/modifier ne masquent jamais une autre modale ;
- [À revoir] vérifier qu’aucune erreur Supabase ou message technique n’est affiché à l’utilisateur.

### 2. Clients & WhatsApp

Objectif : éviter la ressaisie pour relance, historique, créances et tâches.

À vérifier :

- [ ] CA client auto ;
- [ ] total payé auto ;
- [ ] reste à payer auto ;
- [ ] commandes ouvertes auto ;
- [ ] relance client prépare message + tâche + alerte/log ;
- [ ] pas de relance en double pour la même créance ;
- [À revoir] masquer ou désactiver les actions WhatsApp si aucun téléphone valide n’existe.

### 3. Fournisseurs

Objectif : fournisseur connecté à stock, finance, documents, tâches, alertes, WhatsApp/logs.

À vérifier :

- [ ] commande fournisseur crée tâche/event/message ;
- [ ] dette fournisseur liée aux réceptions stock ;
- [ ] paiement dette crée finance sortie + document + trace ;
- [ ] dette remise à jour sans écrasement erroné ;
- [À revoir] masquer ou désactiver WhatsApp si aucun téléphone valide n’existe ;
- [À revoir] éviter de proposer dette fournisseur si aucun fournisseur valide n’est lié.

### 4. Stock

Objectif : stock comme centre des intrants, aliments, médicaments, récoltes, consommables.

À vérifier :

- [ ] réception payée → stock + finance + document + trace ;
- [ ] réception dette → stock + fournisseur + document + alerte + tâche + trace ;
- [ ] sortie santé/alimentation/intrants décrémente bien ;
- [ ] seuil critique persistant sans boucle de doublons ;
- [ ] historique mouvements stock exploitable ;
- [À revoir] les choix dette fournisseur doivent dépendre d’un fournisseur réel ;
- [À revoir] remplacer les prompts par une preview propre.

### 5. Santé & Biosécurité

Objectif : un soin ou événement sanitaire doit alimenter santé, stock, finance, vétérinaire, tâche, alerte, document, trace.

À vérifier :

- [ ] source produit claire ;
- [ ] décrément stock seulement si stock interne ;
- [ ] blocage si quantité utilisée > disponible ;
- [ ] cas biosécurité bien séparés du curatif/préventif ;
- [ ] maladie/mortalité peut déclencher biosécurité ;
- [À revoir] ne pas proposer animaux/lots si aucune entité valide n’existe ;
- [À revoir] après changement de périmètre, réinitialiser proprement la cible précise et les IDs liés ;
- [À revoir] vérifier que `module_lie`, `related_id`, `target_count` et `target_summary` sont toujours cohérents.

### 6. Animaux

Objectif : détecter automatiquement les animaux à risque et créer un suivi complet.

À vérifier :

- [ ] malade/blessé/sous traitement détecté ;
- [ ] croissance lente/perte poids détectée ;
- [ ] créer suivi → santé + tâche + alerte + trace + animal mis à jour ;
- [ ] animal sous traitement peut bloquer ou avertir à la vente ;
- [À revoir] empêcher double création de suivi sur double clic ou refresh.

### 7. Avicole

Objectif : lots connectés à santé, biosécurité, ponte, mortalité, tâches et alertes.

À vérifier :

- [ ] lots malades/morts/mortalité élevée détectés ;
- [ ] baisse ponte détectée ;
- [ ] créer suivi → santé + tâche + alerte + trace + lot mis à jour ;
- [ ] mortalité élevée déclenche biosécurité ;
- [À revoir] ne pas proposer suivi lot si aucun lot actif valide n’existe ;
- [À revoir] empêcher double création de suivi pour le même lot/risque.

### 8. Cultures / Parcelles / Campagnes / Récoltes

Objectif : culture connectée à stock récolte, suivi parcelle/campagne, alertes, tâches, documents et traçabilité.

À vérifier :

- [À tester] culture à risque détectée selon score santé, pertes, statut perdu ou récolte sous objectif ;
- [À tester] récolte proche détectée depuis `date_recolte_prevue` ;
- [À tester] créer suivi → tâche + alerte + business_event + culture mise à jour ;
- [À tester] enregistrer récolte → stock récolte + document + business_event + culture mise à jour ;
- [À tester] coût/marge par culture visibles dans le module ;
- [À tester] coût par parcelle et campagne via agrégations existantes ;
- [À revoir] remplacer les `window.prompt` de récolte par une vraie preview corrigeable ;
- [À revoir] centraliser le workflow récolte/suivi culture dans `workflowService` ;
- [À revoir] ne pas proposer récolte si quantité prévue absente et aucune culture valide ;
- [À revoir] empêcher double stock récolte sur double clic/revalidation.

---

## Blocs restants à renforcer

### 1. Cultures / Parcelles / Campagnes / Récoltes / Intrants

Workflows attendus :

```txt
Utiliser intrant
→ sortie stock
→ coût culture/campagne
→ trace

Récolter
→ stock récolte
→ rendement parcelle/campagne
→ trace

Vendre récolte
→ vente
→ facture
→ paiement
→ finance
→ client
→ stock décrémenté
```

À ajouter / vérifier :

- [À tester] coût par campagne ;
- [À tester] coût par parcelle ;
- [À revoir] rendement par hectare ;
- [À tester] marge par culture ;
- [À revoir] historique cultural exploitable depuis business_events ;
- [À tester] alerte rendement faible / récolte sous objectif via suivi culture ;
- [À faire] lien business plan/investissement si applicable ;
- [À faire] workflow `Utiliser intrant` relié au stock intrants et au coût culture/campagne ;
- [À revoir] workflow récolte à migrer vers preview centralisée.

### 2. Finances / Comptabilité

Objectif : finances comme vérité économique, pas double saisie.

À ajouter / vérifier :

- [ ] toutes les transactions ont `module_lie`, `related_id`, `source_module`, `source_record_id` ;
- [ ] catégories dynamiques selon activité ;
- [ ] anti-doublon transversal ;
- [ ] justificatifs manquants détectés ;
- [ ] dettes fournisseurs et créances clients visibles ;
- [ ] compte résultat simplifié ;
- [ ] corrections manuelles auditables ;
- [À revoir] aucune transaction générée ne doit afficher d’erreur technique ;
- [À revoir] les écritures comptables ne doivent pas être confondues avec les transactions métier.

### 3. Investissements / Business Plans

Workflows attendus :

```txt
Ligne business plan validée
→ investissement réel
→ finance
→ document
→ actif réel si applicable
→ trace
→ écart prévu/réel
```

À ajouter / vérifier :

- [ ] achat équipement depuis BP crée équipement ;
- [ ] achat stock depuis BP crée stock ;
- [ ] achat animaux/avicole depuis BP crée actif métier ;
- [ ] financement reçu → entrée finance ;
- [ ] risques BP reliés aux alertes ;
- [ ] ROI prévu/réel ;
- [À revoir] ne pas proposer création d’actif si les données minimales de l’actif sont absentes.

### 4. Alertes / Tâches / Documents / Traçabilité

Objectif : couche transversale d’action et de preuve.

À ajouter / vérifier :

- [ ] alertes critiques persistées ;
- [ ] pas de recréation en boucle ;
- [ ] alerte → tâche/action rapide ;
- [ ] tâche clôturée → trace/preuve ;
- [ ] document lié par `entity_type/entity_id/module_source` ;
- [ ] chaque workflow important crée un business_event ;
- [ ] `saisies_evitees` visible dans les events ;
- [À revoir] une alerte ne doit pas créer une tâche si une tâche ouverte existe déjà pour la même cible/action.

### 5. Dashboard / Impact Business / Rapports

Objectif : montrer la valeur des interconnexions.

À ajouter / vérifier :

- [ ] workflows automatisés ;
- [ ] saisies évitées ;
- [ ] documents générés ;
- [ ] créances détectées ;
- [ ] alertes traitées ;
- [ ] incidents sanitaires évités ou réduits ;
- [ ] rapports finance, ventes, stock, santé, cultures, avicole, animaux, investissements ;
- [À revoir] ne pas afficher de commentaires métier longs ou techniques dans les KPI.

### 6. Équipements / Maintenance

Workflows attendus :

```txt
Panne équipement
→ alerte
→ tâche maintenance
→ finance si coût
→ document
→ trace
→ statut indisponible

Maintenance terminée
→ statut disponible
→ prochaine maintenance
→ coût cumulé
→ trace
```

À ajouter / vérifier :

- [ ] coût maintenance cumulé ;
- [ ] taux disponibilité ;
- [ ] prochaine maintenance ;
- [ ] achat équipement lié à investissement/finance/document ;
- [ ] alertes maintenance dues ;
- [À revoir] ne pas proposer maintenance si aucun équipement actif n’existe.

### 7. Smart Farm / Capteurs / Caméras / Météo

Objectif : transformer les signaux en actions.

À ajouter / vérifier :

- [ ] capteur offline → alerte + tâche ;
- [ ] température/humidité/eau anormale → alerte + action recommandée ;
- [ ] signal sanitaire/environnemental → biosécurité ;
- [ ] recommandation météo → tâche ;
- [ ] caméra/capteur lié à zone, lot, bâtiment ou parcelle ;
- [À revoir] ne pas proposer action capteur/caméra si aucun device valide n’existe.

### 8. Sync Offline / Audit Logs

Objectif : rendre les workflows fiables même avec réseau instable.

À ajouter / vérifier :

- [ ] queue offline pour workflows critiques ;
- [ ] replay sans doublons ;
- [ ] conflits local/serveur visibles ;
- [ ] audit workflow commit ;
- [ ] audit correction manuelle ;
- [ ] before/after si possible ;
- [ ] filtres module/action/date ;
- [À revoir] les erreurs de synchronisation doivent être lisibles métier, pas techniques.

---

## Nouvelles améliorations détectées

### 2026-05-09

- [À revoir] Plusieurs bridges ajoutent de la valeur rapidement mais contiennent encore de la logique métier dans React. À centraliser progressivement dans `workflowService` / `workflowEngine`.
- [À revoir] Les actions `Créer suivi`, `Réceptionner`, `Payer`, `Relancer`, `Enregistrer récolte` doivent évoluer vers une preview uniforme avec badges `Auto` / `Modifié`.
- [À faire] Ajouter une clé `dedupe_key` dans les créations multi-modules pour éviter les doublons tâche/alerte/event/document/finance.
- [À faire] Simuler ou créer `workflow_runs` pour mesurer les automatisations et alimenter Impact Business.
- [À revoir] Les prompts navigateur utilisés temporairement doivent être remplacés par des modales UX propres.
- [À faire] Ajouter un contrôle qualité fonctionnel avant tout statut `[Traité]` : entités valides, champs dépendants, absence d’erreur visible, interconnexion réellement vérifiable.
- [À revoir] Les listes déroulantes module/cible doivent être désactivées ou masquées si aucune entité valide n’existe derrière.
- [À revoir] Tous les messages d’erreur techniques doivent être convertis en messages utilisateur métier.

---

## Journal des avancées

### 2026-05-09

[En cours] PR #2 — Interconnexions ERP et statuts ventes.

Déjà observé :

- ventes/paiements/factures mieux séparés ;
- logique finance sync enrichie ;
- stock connecté à finance/documents/trace ;
- santé renommée et enrichie vers Santé & Biosécurité ;
- bridges Animaux et Avicole ajoutés ;
- base workflowService renforcée ;
- besoin de centraliser progressivement les automatisations dans un moteur workflow.

[À tester] Bloc Cultures ajouté : `CulturesWorkflowBridge.jsx` détecte cultures à risque et récoltes proches, puis peut créer tâche, alerte, business_event, stock récolte, document et mise à jour culture.

[À revoir] Le workflow Cultures fonctionne mais utilise encore des `window.prompt` pour quantité/unité/prix de récolte. À remplacer par une preview corrigeable avant commit.

[À faire] Ajouter le workflow `Utiliser intrant` : sortie stock intrant → coût culture/campagne → tâche/trace si besoin.

[Traité] Ajout d’une règle de qualité fonctionnelle : un bloc n’est pas terminé parce qu’il s’affiche, il doit être cohérent, testable, interconnecté, sans message technique visible, sans doublon et vérifiable dans les modules liés.

---

## Prompt recommandé pour l’agent développeur

À copier au début de chaque session :

```txt
Avant de continuer Horizon Farm, lis d’abord `docs/ameliorations-continues-horizon-farm.md`.

Respecte la vision produit : moins de saisie, modules riches, interconnexions automatiques, preview avant validation, anti-doublon, audit/traçabilité et cohérence fonctionnelle réelle.

Quand tu avances sur un bloc :
1. mets à jour le journal des avancées dans ce fichier ;
2. marque les points traités avec [Traité] ou [À tester] ;
3. ajoute les nouvelles améliorations détectées ;
4. évite de disperser la logique métier dans les composants React si elle peut aller dans un workflow centralisé ;
5. vérifie que les workflows ne créent pas de doublons ;
6. vérifie que les champs déjà connus ne sont pas redemandés à l’utilisateur ;
7. vérifie que les listes déroulantes ne proposent que des entités valides ;
8. vérifie que les champs dépendants se remplissent ou se réinitialisent correctement ;
9. vérifie qu’aucune erreur technique ou commentaire brouillon n’est visible côté utilisateur ;
10. vérifie que l’interconnexion est réellement visible dans les modules liés.

À la fin de ta session, résume dans ce fichier ce qui a été fait, ce qui reste à tester, et les risques détectés.
```

---

## Décision produit actuelle

Ne pas ajouter de refactor massif tant que les 8 blocs restants ne sont pas terminés.

Priorité actuelle : laisser les blocs se compléter, puis faire une revue globale de cohérence.

Après les 8 blocs :

```txt
1. tester module par module ;
2. repérer les doublons de logique ;
3. centraliser les workflows ;
4. fiabiliser anti-doublon ;
5. brancher Impact Business / Audit Logs ;
6. nettoyer l’UX ;
7. merger seulement après validation complète.
```

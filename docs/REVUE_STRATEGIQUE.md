# Revue stratégique — pilotage, finance, traçabilité, IA, commercial, alertes

Réponse aux questions de fond : « les chiffres reflètent-ils la réalité de ma
ferme ? ai-je tracé tous les coûts ? tout le cycle des sujets et cultures ?
peut-on simplifier la vente ? blinder alertes et notifications ? ».
Chaque section donne **le constat**, **l'avis**, et **l'action recommandée**
(fait / à décider / à construire).

---

## 1. Finance : refléter la réalité « tous comptes confondus »

### Constat
- La consolidation (`consolidateFinance`) produit **un seul** chiffre de
  trésorerie : `cashNet = encaissé ventes + autres entrées + paiements orphelins
  − charges payées`. C'est cohérent et anti-doublon (corrigé récemment), mais
  c'est un **agrégat**.
- Les paiements portent déjà un `moyen_paiement` (espèces, Wave, OM, virement…),
  mais **rien ne ventile la trésorerie par compte**, et **aucun mécanisme ne
  compare le solde ERP au solde réel** de chaque compte.
- Conséquence : impossible aujourd'hui d'affirmer « l'ERP = ce que j'ai
  réellement sur Wave / OM / en caisse / en banque ».

### Avis
C'est le chantier n°1. Un ERP de ferme doit répondre en 5 secondes à « combien
j'ai, où, maintenant ». La bonne architecture, par ordre de valeur/effort :

1. **Comptes de trésorerie explicites** (table `comptes_tresorerie` :
   `espèces`, `Wave`, `OM`, `banque`, + libres). Chaque paiement / dépense
   pointe un compte. → ventilation automatique du `cashNet` par compte.
2. **Rapprochement manuel périodique** : l'éleveur saisit le solde réel constaté
   (relevé Wave, comptage caisse) ; l'ERP affiche l'**écart** ERP↔réel et le
   trace. C'est la garantie « les chiffres = la réalité », sans dépendre d'API
   bancaires. Simple, robuste, terrain.
3. **Ajustement de caisse** : un écart persistant se solde par une écriture
   d'ajustement explicite (jamais une suppression de données), avec motif.
4. (Plus tard) **Synchronisation** Wave/OM via API si disponible — optionnel,
   le rapprochement manuel reste le filet de sécurité.

### Action
- **À construire** (fondation) : `buildTreasuryByAccount()` — ventile le
  `cashNet` par compte à partir des `moyen_paiement` existants, sans nouvelle
  table (première brique, zéro risque de perte de données).
- **À décider avec l'utilisateur** : introduit-on une vraie table de comptes +
  rapprochement (recommandé) ou se contente-t-on de la ventilation dérivée ?

---

## 2. Coûts & charges : tout est-il tracé, de A à Z ?

### Constat
Le moteur unifié (`unifiedCostService` + `costEngine`) et
`deriveBusinessCharges` couvrent déjà large :
- **Coût par sujet** = achat + alimentation réelle + santé + autres directs.
- **Charges consolidées** = animaux + avicole + cultures + achats stock + santé
  + alimentation + investissements + événements (avec anti-double-comptage).
- Pertes intégrées au coût **sans** sortie de caisse (correct).

### Avis — les angles morts probables
1. **Main-d'œuvre / salaires** : tracée pour les cultures (`cout_main_oeuvre`)
   mais **pas** comme charge transversale récurrente (ouvriers, gardien).
2. **Charges fixes récurrentes** : loyer/foncier, électricité, eau, carburant,
   abonnements, téléphone — pas de notion de charge périodique automatique.
3. **Amortissement des équipements/investissements** : les investissements sont
   comptés en bloc, pas étalés → distorsion du coût de revient mensuel.
4. **Transport/logistique** de vente et frais mobile-money (commissions Wave/OM)
   — souvent oubliés, rongent la marge réelle.
5. **Mortalité/casse** au-delà des « pertes » explicites.

### Action
- **À construire** : notion de **charge récurrente** (charges fixes mensuelles)
  + une catégorie « main-d'œuvre » transversale + intégration des **commissions
  mobile-money** dans le coût d'encaissement.
- **Rapide** : ajouter une **checklist de complétude des charges** dans l'audit
  chiffres (alerte si aucune charge fixe/salaire saisie alors que la ferme
  tourne).

---

## 3. Traçabilité des sujets (volailles, bovins) et des cultures

### Constat
Déjà présents : santé, biosécurité, pesée, mortalité, alimentation (logs),
production (ponte), coût unifié par sujet, alertes techniques.

### Avis — pour une traçabilité « entrée → sortie » complète
Le cadre existe mais gagnerait à être structuré comme un **cycle de vie** :

| Étape | Volailles / bovins | Cultures |
| --- | --- | --- |
| Entrée | achat/naissance, origine, poids/âge initial | semis/plantation, parcelle, intrant |
| Vie | alimentation, pesées, santé, biosécurité, reproduction | irrigation, fertilisation, traitements, stade |
| Sortie | vente, abattage, mort, transfert | récolte, perte |

- **Ce qui manque** : un **journal de cycle unifié par entité** (une frise
  « du jour 1 à la sortie ») consolidant tous les événements d'un sujet/lot/
  parcelle en un seul écran. Les données existent, éparpillées.
- **Biosécurité** : présente en alertes ; à formaliser en **protocole**
  (vaccinations planifiées, quarantaine, désinfection) avec échéances.
- **Cultures** : même logique que l'élevage, mais le suivi phénologique
  (stades) et l'itinéraire technique sont plus légers que le volet animal.

### Action
- **À construire** : vue « **Carnet de vie** » par entité (agrège événements
  existants ; pas de nouvelle saisie, juste une frise).
- **À décider** : formaliser les protocoles de biosécurité/vaccination avec
  échéances → génère des tâches automatiques (lien avec §6).

---

## 4. Centre décisionnel basé sur les données (IA)

### Constat
Il existe déjà un moteur de règles (`erpRules`, `predictiveRules`,
`objectifsDecision`, assistant terrain). Bonne base.

### Avis
Passer de « règles + réponses » à un **centre décisionnel** qui, chaque jour :
1. lit les KPI consolidés (trésorerie par compte, marge réelle, coûts, stock,
   santé, créances) ;
2. détecte les **écarts vs objectifs** et les **tendances** (marge qui se
   dégrade, coût alimentation qui dérive, créances qui vieillissent) ;
3. propose **3 décisions prioritaires** chiffrées (« relancer client X : +250k »,
   « lot Y sous seuil marge : ajuster prix ou avancer la vente »).

Le socle « chiffres consolidés fiables » (§1-2) est **prérequis** : une IA sur
des chiffres faux amplifie l'erreur. D'où l'ordre : d'abord fiabiliser, ensuite
décider.

### Action
- **À construire** (après §1-2) : un `buildDecisionBriefing()` quotidien qui
  agrège KPI + écarts + top 3 actions, affiché sur l'Accueil et poussé en
  notification du matin (le cron 7h existe déjà).

---

## 5. Commercial : simplifier la vente

### Constat
Plusieurs chemins de vente coexistent (`VentesV6`, `SaleActionModal`,
`DailySaleModal`, `MobileMoneyPayPanel`, publication…). Riche mais **dispersé**.

### Avis
La vente terrain doit tenir en **3 gestes** : *qui / quoi+combien / payé
comment*. Recommandations :
- **Une seule entrée « Vente rapide »** par défaut (le `DailySaleModal` est le
  bon candidat), les écrans avancés restant accessibles mais secondaires.
- **Prix pré-rempli** par le moteur commercial (déjà calculé : coût + marge
  cible), modifiable, avec la marge affichée en direct.
- **Encaissement en un tap** : espèces / Wave / OM, montant pré-rempli au total.
- **Zéro double saisie** : la vente crée automatiquement la ligne finance et le
  mouvement de stock/effectif (interconnexions déjà en place).

### Action
- **À décider** : fait-on du `DailySaleModal` le point d'entrée unique de la
  vente (recommandé) ? Puis on masque/relègue les chemins redondants.

---

## 6. Alertes & création de tâches (viser 99/100)

### Constat
Alertes techniques (`technicalFarmingRules`), dérivées (santé, mortalité,
rupture, culture perdue), sévérités urgence/critique/warning/info, liaison aux
modules. Solide.

### Avis — pour blinder
1. **Chaque alerte critique doit produire une tâche actionnable** avec échéance
   et responsable (aujourd'hui alerte ≠ toujours tâche).
2. **Cycle de vie complet** : nouvelle → vue → en cours → traitée, avec
   anti-réapparition (dedup déjà partiel).
3. **Couverture exhaustive** des seuils : santé, mortalité, stock, créances
   vieillissantes, marge sous seuil, trésorerie négative par compte, échéances
   de biosécurité/vaccination, paiements orphelins.
4. **Escalade** : une alerte urgence non traitée après N jours → notification
   renforcée.

### Action
- **À construire** : règle « alerte critique → tâche automatique » +
  couverture des seuils manquants (marge, trésorerie par compte, échéances
  biosécurité).

---

## 7. Notifications — **corrigé dans cette itération**

### Constat & correctif
- **Cause racine trouvée et corrigée** : `public/sw.js` n'avait **aucun**
  gestionnaire `push`/`notificationclick`. Le navigateur recevait le message
  mais n'affichait rien → aucune notification en arrière-plan.
- **UX simplifiée** : fini le duo « Activer / Mode avancé » déroutant. Un seul
  bouton « Activer les notifications » couvre l'app (immédiat) et l'arrière-plan
  (push si le serveur est configuré).
- **Documenté** : catégories, pertinence, logique d'envoi et configuration VAPID
  → `docs/NOTIFICATIONS.md`.

### Reste à faire côté utilisateur
Renseigner les clés VAPID dans Vercel (secrets, hors dépôt) pour activer le push
en arrière-plan. Sans ça, les notifications **dans l'app** fonctionnent déjà.

---

## Ordre recommandé

1. **Notifications** ✅ (fait).
2. **Finance réalité** : ventilation par compte → rapprochement manuel (socle).
3. **Coûts A→Z** : charges fixes, main-d'œuvre, commissions mobile-money,
   amortissements.
4. **Traçabilité** : Carnet de vie par entité + protocoles biosécurité.
5. **Alertes → tâches** automatiques + seuils manquants.
6. **Commercial** : vente rapide unique.
7. **Centre décisionnel IA** : briefing quotidien (une fois 2-3 fiabilisés).

> Principe directeur : **d'abord fiabiliser les chiffres, ensuite décider
> dessus**. Un ERP beau mais aux chiffres non consolidés ne sert à rien.
</content>

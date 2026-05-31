#!/usr/bin/env python3
"""Génère decisionMethodology.js — Annexe en langage simple (sans jargon technique)."""

import json
from pathlib import Path

def p(label, unit, default, where):
    return {"label": label, "unit": unit, "default": default, "where": where}

def blk(id_, modules, category, title, summary, formula, parameters, outputs):
    return {
        "id": id_,
        "modules": modules,
        "category": category,
        "title": title,
        "summary": summary,
        "formula": formula.strip(),
        "parameters": parameters,
        "outputs": outputs,
    }

BOTH = ["centre_ia", "objectifs_croissance"]
CENTRE = ["centre_ia"]
OBJ = ["objectifs_croissance"]

blocks = [
    blk("hijri_calendar", BOTH, "calendrier",
        "Dates des fêtes (calendrier musulman)",
        "Le système calcule tout seul la date de Tabaski, Korité, Ramadan, Magal, Gamou et fin d'année, sans que vous ayez à les saisir.",
        """Chaque fête a une date fixe dans le calendrier musulman (hijri).
Le logiciel la convertit en date du calendrier courant.

Exemples :
• Tabaski → 10e jour du 12e mois hijri
• Korité → 1er jour du 10e mois hijri
• Magal → 18e jour du 2e mois hijri

Date limite pour se préparer = date de la fête − durée du cycle (90 j bœuf, 40 j poulet, 30 j œufs).""",
        [p("Date de la fête", "jour", "calculée auto", "Paramètres pilotage → fêtes (surcharge possible)"),
         p("Durée du cycle", "jours", "90 / 40 / 30", "Réglages de la ferme")],
        ["Date de la fête affichée", "Date limite pour lancer ou acheter"]),

    blk("launch_timing", CENTRE, "calendrier",
        "Quand lancer une bande avant une fête ?",
        "Pour vendre au bon moment (Tabaski, Korité, Magal…), il faut lancer ou acheter assez tôt. Le Centre vous donne la dernière date possible.",
        """Pour chaque fête et chaque produit :

Date limite = date de la fête − nombre de jours du cycle

Durées habituelles :
• Bœufs (embouche) : 90 jours
• Poulets de chair : 40 jours
• Œufs / ponte : 30 jours

Alerte rouge si la date limite est passée et que vous n'avez rien en production.
Alerte orange s'il reste moins de 14 jours.""",
        [p("Date de la fête", "jour", "auto", "Calendrier fêtes du Centre"),
         p("Cycle bœuf", "jours", "90", "Réglages Centre"),
         p("Cycle poulet chair", "jours", "40", "Réglages Centre")],
        ["Message « lancer avant le… »", "Niveau d'urgence (critique / moyen)"]),

    blk("date_pivot", BOTH, "calendrier",
        "Âge d'une bande et objectif du catalogue",
        "On compte combien de jours se sont écoulés depuis l'arrivée des poussins ou pondeuses, puis on compare à ce que la race devrait produire à cet âge.",
        """Date de départ = jour où la bande est entrée à la ferme.

Âge en jours = aujourd'hui − date de départ.

Objectif du catalogue = ce que votre type de poules devrait peser ou pondre à cet âge (fiche race).""",
        [p("Date d'entrée de la bande", "jour", "date saisie", "Fiche bande avicole → date de début"),
         p("Type de race", "texte", "ex. Novogen", "Fiche bande → race / souche"),
         p("Âge actuel", "jours", "calculé", "Automatique")],
        ["Âge en jours", "Objectif catalogue", "Type d'atelier (chair, ponte, bœuf)"]),

    blk("lead_times", BOTH, "calendrier",
        "Combien de jours avant une vente ?",
        "Délai moyen pour qu'un produit soit prêt : œufs ~150 j, poulet ~40 j, bœuf ~90 j.",
        """Le système regarde l'historique de votre ferme.
S'il manque d'infos, il utilise des durées standard :

• Ponte : 150 jours
• Poulet chair : 40 jours
• Bœuf / mouton / chèvre : 90 jours
• Maraîchage : 90 jours

Cela sert à dire : « commencez au plus tard le… » avant une grosse demande.""",
        [p("Durée cycle ponte", "jours", "150", "Historique bandes pondeuses"),
         p("Durée cycle chair", "jours", "40", "Historique bandes chair"),
         p("Durée embouche", "jours", "90", "Fiche animaux bovins")],
        ["Délai par activité"]),

    blk("commercial_calendar", CENTRE, "calendrier",
        "Objectif de vente mois par mois",
        "Chaque mois a un chiffre d'affaires cible issu du business plan. Le Centre indique où concentrer les efforts (œufs, chair, bœufs).",
        """Pour chaque mois de l'année :
• Objectif de ventes en FCFA
• Activités prioritaires ce mois-là

Le mois en cours et les 6 suivants sont mis en avant.""",
        [p("Objectif mensuel", "FCFA", "business plan", "Module Objectifs / plan officiel")],
        ["Mois en cours", "Six prochains mois"]),

    blk("sell_now", CENTRE, "commerce",
        "Quand vendre tout de suite ? (bœuf ou poulet)",
        "Si l'animal coûte plus cher à nourrir chaque jour qu'il ne prend en valeur, il vaut mieux le vendre maintenant.",
        """Chaque jour on compare deux montants :

1) Gain du jour = prise de poids du jour × prix de vente au kilo
2) Coût du jour = aliment mangé ce jour × prix du sac d'aliment

Si le coût dépasse le gain → alerte « VENDRE MAINTENANT ».

Exemple : gain 1 500 F/j, ration 1 800 F/j → vous perdez de l'argent à le garder.""",
        [p("Prise de poids par jour", "kg/j", "pesées + alimentation", "Module Animaux ou Avicole"),
         p("Prix viande au marché", "FCFA/kg", "prix saisi", "Fiche animal ou marché"),
         p("Aliment consommé par jour", "kg/j", "distribution", "Module Alimentation"),
         p("Prix aliment", "FCFA/kg", "dernier achat", "Module Stock / Achats")],
        ["Alerte urgence vente", "Montant gain vs coût du jour"]),

    blk("commercial_gap", BOTH, "commerce",
        "Écart entre objectif de vente et réalisé",
        "Compare ce que vous deviez vendre ce mois et ce que vous avez vraiment encaissé, par activité (œufs, chair, bœufs…).",
        """Par activité :
Reste à vendre = objectif du mois − ventes déjà faites
Taux de réussite = ventes ÷ objectif × 100

Global :
Trésorerie encaissée, dépenses du mois, marge = ventes − dépenses.""",
        [p("Objectif du mois", "FCFA", "business plan", "Objectifs & Croissance"),
         p("Ventes enregistrées", "FCFA", "—", "Module Ventes / Finances")],
        ["Reste à vendre", "Pourcentage d'objectif atteint"]),

    blk("production_capacity", BOTH, "commerce",
        "Combien d'œufs produisez-vous par jour ?",
        "Compte les pondeuses actives et la moyenne d'œufs des 14 derniers jours pour estimer tablettes/jour et taux de ponte.",
        """Pondeuses vivantes = total des sujets en production.

Œufs par jour = moyenne des 14 derniers jours de comptage.

Taux de ponte (%) = œufs du jour ÷ pondeuses × 100.

Tablettes par jour ≈ œufs ÷ 30.""",
        [p("Journal de ponte", "œufs/j", "—", "Module Production → comptage œufs"),
         p("Effectif pondeuses", "sujets", "—", "Module Avicole → bande pondeuse")],
        ["Œufs/jour", "Tablettes/jour", "Taux de ponte %"]),

    blk("financial_gap", OBJ, "commerce",
        "Écart par atelier (pondeuses, chair, bœufs…)",
        "Pour chaque activité : objectif du mois vs ventes réelles, et alerte si le prix pratiqué est trop bas.",
        """Par atelier :
• Ventes du mois vs objectif du mois
• Marge visée vs marge estimée
• Alerte si prix de vente trop bas par rapport au coût""",
        [p("Objectif CA atelier", "FCFA/mois", "business plan", "Objectifs & Croissance"),
         p("Marge brute visée", "%", "35 %", "Paramètres pilotage")],
        ["Écart CA", "Écart marge", "Alertes prix"]),

    blk("workshop_targets", OBJ, "commerce",
        "Objectifs mensuels par activité",
        "Découpe l'objectif annuel en mois pour pondeuses, chair, bœufs et maraîchage.",
        """Chaque mois :
Objectif ventes = ligne du business plan pour l'activité
Objectif marge = objectif ventes × marge visée (ex. 35 %)""",
        [p("Marge visée", "%", "35", "Paramètres pilotage"),
         p("Plan maraîchage", "FCFA/mois", "réglages", "Paramètres pilotage")],
        ["Objectif mensuel par atelier", "Objectif marge annuel"]),

    blk("break_even", BOTH, "commerce",
        "Point mort du mois (seuil de rentabilité)",
        "Montant minimum à vendre ce mois pour couvrir salaires, charges fixes et variables.",
        """Charges fixes du mois = (loyer, salaires annuels…) ÷ 12
Charges variables = achats variables ÷ 12

Seuil rentabilité = (fixes + variables) ÷ marge brute visée

Objectif marge nette = seuil plus élevé si vous voulez garder X % de bénéfice.

Écart = seuil − ventes déjà faites ce mois.""",
        [p("Marge brute visée", "%", "35", "Paramètres pilotage"),
         p("Marge nette visée", "%", "12", "Paramètres pilotage"),
         p("Charges du business plan", "FCFA/an", "plan officiel", "Business plan ERP")],
        ["Seuil minimum du mois", "Objectif avec marge nette", "Rentable ou non"]),

    blk("demand_coverage", BOTH, "demande",
        "Assez de stock pour la demande ?",
        "Estime combien les clients vont demander (fêtes, saison) et vérifie si votre stock ou production peut couvrir.",
        """Indice de demande = saison + effet fête (Tabaski, Korité…)

Objectif ventes du mois = part annuelle × indice

Stock disponible valorisé ÷ objectif = taux de couverture %

Manque = objectif − ce que vous pouvez livrer

Dernière date pour lancer = date cible − délai de production""",
        [p("Mix des activités", "parts", "business plan", "Paramètres pilotage"),
         p("Prix moyen de vente", "FCFA", "historique", "Module Ventes"),
         p("Stock / production dispo", "unités", "—", "Stock + production en cours")],
        ["Taux couverture %", "Manque en FCFA", "Date limite pour produire"]),

    blk("demand_forecast", BOTH, "demande",
        "Prévision de demande du mois",
        "Anticipe les ventes du mois selon la saison et les fêtes à venir.",
        """Facteur saison = mois fort ou faible historiquement
Bonus fête = +8 % à +18 % si grosse fête dans le mois

Objectif du mois = part annuelle × facteurs
Quantité estimée = objectif ÷ prix moyen""",
        [p("Objectif annuel", "FCFA", "business plan", "Paramètres pilotage"),
         p("Fêtes du mois", "liste", "auto", "Calendrier Centre")],
        ["Indice demande", "Objectif FCFA", "Quantité estimée"]),

    blk("supply_coverage", BOTH, "demande",
        "Ce que la ferme peut livrer",
        "Additionne stock prêt à vendre + production à venir, moins les commandes déjà promises.",
        """Disponible = stock + production prévue − engagements clients
Valeur dispo = quantité × prix moyen
Couverture = valeur dispo ÷ objectif du mois × 100""",
        [p("Stocks produits finis", "unités", "—", "Module Stock"),
         p("Capacité production", "œufs/j…", "—", "Production en cours")],
        ["Quantité disponible", "Taux de couverture %"]),

    blk("zootechnical", BOTH, "zootechnie",
        "Performance réelle vs fiche race",
        "Compare ponte, poids ou croissance réels à ce que la race devrait faire à le même âge.",
        """Écart % = (réel − objectif catalogue) ÷ objectif × 100

Vert si écart petit (dans la marge de tolérance).
Orange / rouge si trop en dessous → risque surcoût aliment ou retard.""",
        [p("Type de race", "texte", "—", "Fiche bande → race"),
         p("Marge de tolérance", "%", "5 à 8", "Catalogue races"),
         p("Cible croissance", "g/j ou kg/j", "selon race", "Catalogue races")],
        ["Valeur réelle", "Objectif catalogue", "Écart %", "Surcoût estimé"]),

    blk("laying_rate", BOTH, "zootechnie",
        "Taux de ponte (% d'œufs par poule)",
        "Sur 7 jours : combien d'œufs par poule par jour, comparé à la fiche race (ex. Lohmann ~92 % au pic).",
        """Taux = total œufs 7 jours ÷ (poules × jours comptés) × 100

Compare au catalogue selon l'âge en semaines.

Chute brutale sur 48 h → alerte (aliment, chaleur ou maladie).""",
        [p("Comptage œufs", "œufs/j", "—", "Module Production"),
         p("Fenêtre de calcul", "jours", "7", "Automatique")],
        ["Taux réel %", "Taux attendu %", "Écart"]),

    blk("gmq_real", BOTH, "zootechnie",
        "Prise de poids par jour",
        "Combien l'animal ou le lot grossit chaque jour. Sert aussi à décider de vendre si la ration coûte trop cher.",
        """Poulet : (poids actuel − poids à l'entrée) ÷ âge en jours (en grammes/j).

Bœuf : (poids actuel − poids à l'entrée) ÷ jours en ferme (en kg/j).

Si coût aliment du jour > gain de valeur du jour → vendre.""",
        [p("Poids actuel", "kg ou g", "pesée", "Fiche lot / animal"),
         p("Poids à l'entrée", "kg", "saisie entrée", "Fiche lot / animal"),
         p("Prix marché", "FCFA/kg", "—", "Fiche animal ou marché")],
        ["Prise de poids/j", "Vendre maintenant ? oui/non"]),

    blk("ic_chair", BOTH, "zootechnie",
        "Kilos d'aliment pour 1 kg de viande (poulet chair)",
        "Plus ce chiffre est élevé, plus vous gaspillez d'aliment. Cible habituelle : 1,6 à 1,9 kg d'aliment par kg de poulet.",
        """Indice = total aliment consommé ÷ poids vif total du lot

Exemple : 1 900 kg aliment pour 1 000 kg de poulets → indice 1,9

Alerte si au-dessus de 1,9 (gaspillage) ou anormalement bas (pesée douteuse).""",
        [p("Aliment distribué au lot", "kg", "cumul", "Module Alimentation"),
         p("Poids vif du lot", "kg", "pesée × effectif", "Fiche bande chair")],
        ["Indice de consommation", "Alerte gaspillage"]),

    blk("ith_heat", BOTH, "zootechnie",
        "Chaleur ressentie (température + humidité)",
        "En canicule, les animaux mangent moins et coûtent plus cher à nourrir. Le Centre peut conseiller de reporter un lancement ou réduire la densité.",
        """Indice chaleur = température (°C) + humidité (%)

Canicule si :
• Indice ≥ 29
• ou température ≥ 38 °C
• ou 3 jours très chauds prévus

Actions proposées : reporter le lancement de 14 jours, réduire les sujets/m² de 15 %.""",
        [p("Température", "°C", "météo", "Météo ferme ou saisie"),
         p("Humidité", "%", "météo", "Météo ferme"),
         p("Seuil alerte chaleur", "—", "29", "Paramètres pilotage")],
        ["Indice chaleur", "Reporter lancement ?", "Réduction densité %"]),

    blk("theoretical_standard", BOTH, "zootechnie",
        "Courbe de référence de la race",
        "Chaque race a une courbe (ponte ou poids selon l'âge). Le système lit la fiche race pour savoir ce qui est normal à J+30, J+60…",
        """À X jours après l'entrée, la fiche race indique :
• taux de ponte attendu, ou
• poids moyen attendu

Le logiciel interpole entre les points de la courbe.""",
        [p("Race / souche", "texte", "—", "Fiche bande"),
         p("Âge de la bande", "jours", "calculé", "Date entrée → aujourd'hui")],
        ["Valeur attendue à cet âge", "Type de mesure (ponte ou poids)"]),

    blk("cost_animal", BOTH, "couts",
        "Coût total d'un bœuf (ou mouton) jusqu'à la vente",
        "Additionne achat de la bête, aliment, soins vétérinaires et autres frais directs.",
        """Coût total =
  prix d'achat de la bête
+ aliment réellement consommé (ou estimation)
+ soins et vaccins
+ chauffage, transport, main d'œuvre…

Marge = prix de vente − coût total
Coût au kilo = coût total ÷ poids à la vente""",
        [p("Prix d'achat bête", "FCFA", "saisie", "Fiche animal"),
         p("Aliment consommé", "FCFA", "journal", "Module Alimentation"),
         p("Soins vétérinaires", "FCFA", "—", "Module Santé")],
        ["Coût total", "Marge", "Coût au kilo", "Prise de poids/j"]),

    blk("cost_avicole", BOTH, "couts",
        "Coût total d'une bande avicole",
        "Poussins achetés + aliment + santé + divers, réparti par œuf ou par kg de poulet.",
        """Coût total =
  poussins (caisse × prix)
+ aliment du lot
+ santé et frais directs

Chair : coût/kg = coût total ÷ (poids moyen × sujets vendables)
Ponte : coût/œuf = coût total ÷ œufs produits""",
        [p("Prix caisse poussins", "FCFA", "32 000 / 50 sujets", "Fiche bande ou défaut"),
         p("Aliment du lot", "FCFA", "cumul", "Alimentation"),
         p("Durée vie pondeuse", "jours", "540", "Référentiel")],
        ["Coût total", "Coût/œuf ou /kg", "Marge sur aliment"]),

    blk("cost_layer_tablet", OBJ, "couts",
        "Coût de vente d'une tablette d'œufs (30 œufs)",
        "Coût des œufs + emballage + transport + casse.",
        """Coût vente =
  (coût par œuf × 30)
+ emballage tablette
+ transport
+ pertes casse

Bénéfice = prix de vente tablettes − coût vente""",
        [p("Œufs par tablette", "œufs", "30", "Standard marché"),
         p("Transport vente", "FCFA", "0", "Saisie vente"),
         p("Pertes casse", "FCFA", "0", "Saisie vente")],
        ["Coût de revient tablette", "Marge"]),

    blk("mca_rentabilite", BOTH, "couts",
        "Gain après coût de l'aliment seul",
        "Montant qu'il vous reste si on ne compte que le coût de l'aliment (hors achat poussins ou bête).",
        """Marge aliment =
  ventes (ou estimation)
− coût aliment seul

En % : (ventes − aliment) ÷ aliment × 100

Utile pour voir si l'alimentation « mange » toute la marge.""",
        [p("Ventes ou estimation", "FCFA", "—", "Ventes / estimation lot"),
         p("Coût aliment", "FCFA", "—", "Alimentation")],
        ["Marge FCFA", "Marge %", "Alerte négative"]),

    blk("rentabilite_ranking", BOTH, "couts",
        "Classement des lots et fournisseurs",
        "Quels lots perdent de l'argent ? Quels fournisseurs d'aliment ou poussins donnent les meilleures marges ?",
        """Par lot ou bête : ventes, coût total, marge, coût unitaire.

Par fournisseur : moyenne des marges sur plusieurs lots.""",
        [p("Fournisseur aliment / poussins", "nom", "—", "Fiche bande ou animal")],
        ["Classement lots", "Classement fournisseurs"]),

    blk("bfr", CENTRE, "flux",
        "Assez d'argent pour acheter l'aliment du prochain cycle ? (BFR)",
        "BFR = argent disponible (caisse + créances clients VIP) comparé au coût aliment d'un cycle complet. Si couverture < 50 %, le lancement est bloqué.",
        """Coût estimé du cycle =
  nombre de sujets × kg aliment/j/sujet × jours du cycle × prix aliment

Argent disponible =
  trésorerie (entrées − sorties)
+ factures clients VIP à encaisser sous 7 jours

Couverture % = argent disponible ÷ coût cycle × 100

Si couverture < 50 % (réglage) → ne pas lancer la bande.""",
        [p("Effectif prochaine bande", "sujets", "5000", "Paramètres pilotage"),
         p("Ration par sujet/j", "kg", "0,095 chair · 4,5 bœuf", "Réglages Centre"),
         p("Couverture minimum", "%", "50", "Paramètres pilotage"),
         p("Clients VIP", "liste", "—", "Paramètres pilotage + fiche client")],
        ["Couverture %", "Lancement bloqué oui/non", "Jours d'autonomie aliment"]),

    blk("stock_audit", BOTH, "flux",
        "Surconsommation d'aliment suspecte (coulage ?)",
        "Compare aliment réellement sorti du silo à ce que les poules/bœufs devraient manger selon la fiche race.",
        """Par bâtiment et par jour :

Théorique = effectif × ration standard du jour
Réel = sorties aliment enregistrées

Écart % = (réel − théorique) ÷ théorique × 100

Alerte si écart > 10 % pendant 3 jours d'affilée
→ vérifier coulage, vol, erreur de pesée.""",
        [p("Seuil écart max", "%", "10", "Réglage moteur"),
         p("Jours consécutifs", "jours", "3", "Réglage moteur"),
         p("Ration standard race", "kg/j/sujet", "fiche race", "Catalogue races")],
        ["Écart %", "Kg théorique vs réel", "Bâtiment concerné"]),

    blk("flux_silo", BOTH, "flux",
        "Combien de jours reste l'aliment en silo ?",
        "Stock en kg ÷ consommation moyenne par jour = jours restants. Alerte si moins de 5 jours.",
        """Consommation/j = moyenne des 30 derniers jours de distribution
(ou estimation : effectif × ration)

Jours restants = stock aliment (kg) ÷ consommation/j

Alerte rouge si < 5 jours.""",
        [p("Stock aliment", "kg", "—", "Module Stock"),
         p("Seuil alerte", "jours", "5", "Réglage Centre")],
        ["Jours restants", "Consommation/j"]),

    blk("flux_occupation", BOTH, "flux",
        "Remplissage des bâtiments et pertes",
        "Combien de sujets par bâtiment ? Mortalité et valeur des pertes.",
        """Taux remplissage ≈ effectif ÷ capacité référence (500 sujets)

Balance : entrées, sorties (ventes), mortalité
Valeur perte = morts × coût unitaire moyen""",
        [p("Bâtiment", "nom", "—", "Fiche bande"),
         p("Capacité référence", "sujets", "500", "Réglage affichage")],
        ["Effectif par bâtiment", "Mortalité %", "Valeur des pertes"]),

    blk("sanitary", BOTH, "flux",
        "Pause obligatoire entre deux bandes (vide sanitaire)",
        "Minimum 10 jours sans animaux entre deux lots dans le même bâtiment pour nettoyer et désinfecter.",
        """Jours entre fin bande précédente et début suivante

Si < 10 jours → blocage lancement
Message : attendre, nettoyer, laisser sécher.""",
        [p("Durée minimum", "jours", "10", "Paramètres pilotage")],
        ["Jours de pause", "Lancement bloqué oui/non"]),

    blk("sanitary_extended", CENTRE, "flux",
        "Pause prolongée après forte mortalité",
        "Si la bande précédente a perdu plus de 5 % des sujets (maladie), ajouter 7 jours de pause et désinfection renforcée.",
        """Taux mortalité bande précédente = morts ÷ effectif initial × 100

Si > 5 % :
  pause totale = 10 j + 7 j supplémentaires
  validation vétérinaire recommandée avant nouveaux poussins""",
        [p("Seuil mortalité", "%", "5", "Paramètres pilotage"),
         p("Jours supplémentaires", "jours", "7", "Paramètres pilotage")],
        ["Taux mortalité %", "Date reprise possible"]),

    blk("shrinkage", BOTH, "flux",
        "Écart entre production et ventes (œufs ou aliment)",
        "Œufs produits vs œufs vendus : écart > 2 % → casse, vol ou oubli de saisie. Même logique sur l'aliment global.",
        """Œufs : écart % = (produits − vendus) ÷ produits × 100

Aliment : écart % = (consommé − standard) ÷ standard × 100

Alerte si seuils dépassés.""",
        [p("Comptage ponte", "œufs", "—", "Production"),
         p("Ventes enregistrées", "—", "—", "Module Ventes")],
        ["Écart %", "Perte estimée en FCFA"]),

    blk("pricing_floor", OBJ, "prix",
        "Prix minimum de vente (ne pas vendre en dessous)",
        "Coût de revient + marge minimum (ex. 15 %) = prix plancher.",
        """Prix plancher = coût unitaire × (1 + marge min %)

Coûts par défaut si pas de calcul :
œuf 550 F · poulet 1 900 F/kg · bœuf 300 000 F · légume 400 F/kg""",
        [p("Coût unitaire", "FCFA", "calcul ERP", "Coûts lot / animal"),
         p("Marge minimum", "%", "15", "Paramètres pilotage")],
        ["Prix plancher"]),

    blk("pricing_seasonality", OBJ, "prix",
        "Saison forte ou faible",
        "Certaines périodes se vendent mieux (fêtes). Le prix conseillé tient compte du mois.",
        """Si historique ventes suffisant :
  coef = ventes ce mois ÷ moyenne mensuelle (entre 0,85 et 1,25)

Sinon :
  forte demande +15 % · normale 100 % · faible −15 %""",
        [p("Historique ventes", "—", "—", "Module Ventes"),
         p("Mois concerné", "—", "aujourd'hui", "Automatique")],
        ["Coefficient saison"]),

    blk("pricing_recommended", OBJ, "prix",
        "Prix de vente conseillé",
        "Le plus élevé entre : prix plancher (coût + marge) et prix marché local ajusté à la saison.",
        """Prix marché local = moyenne prix marché à votre zone
Prix ajusté = marché × coefficient saison

Prix conseillé = MAX(prix plancher ; prix ajusté)

Alerte si votre coût est plus haut que le marché → risque de vendre à perte.""",
        [p("Prix marché local", "FCFA", "catalogue ou saisie", "Prix marché / catalogue"),
         p("Localité", "ville", "—", "Fiche ferme")],
        ["Prix conseillé", "Alerte vente à perte"]),

    blk("pricing_matrix", OBJ, "prix",
        "Tableau prix par activité",
        "Pour œufs, chair et bœufs : prix conseillé vs prix que vous pratiquez en moyenne.",
        """Une ligne par activité :
• coût unitaire
• prix plancher
• prix marché ajusté
• prix conseillé
• prix moyen de vos ventes récentes""",
        [p("Coûts par activité", "FCFA", "ERP", "Calculs coûts"),
         p("Activités", "liste", "œufs, chair, bœufs", "Automatique")],
        ["Tableau prix", "Alertes mauvais prix"]),

    blk("scissors_effect", CENTRE, "analytique",
        "Prix du maïs / soja qui monte (effet ciseau)",
        "Si les intrants alimentaires augmentent fortement, le Centre propose d'acheter 3 mois de stock maintenant pour économiser.",
        """Pour maïs, soja, tourteau :
  hausse mensuelle estimée → projection sur 3 mois

Si hausse ≥ 5 %/mois :
  économie possible = stock actuel × prix × hausse estimée × 50 %

Recommandation si trésorerie suffisante.""",
        [p("Cours intrants", "FCFA", "—", "Prix marché enregistrés"),
         p("Stock aliment actuel", "kg", "—", "Module Stock")],
        ["Hausse estimée %", "Économie possible FCFA"]),

    blk("transformation_arbitrage", CENTRE, "analytique",
        "Mieux vendre les œufs ou les incuber en poussins ?",
        "Compare marge tablette d'œufs vs poussin d'un jour (électricité couvoir incluse).",
        """Marge œuf = prix tablette

Marge poussin = prix poussin × taux éclosion − coût électricité/œuf

Si poussin plus rentable de ≥ 5 % → conseiller % de ponte à incuber
Sinon → vendre les œufs directement""",
        [p("Prix tablette", "FCFA", "900", "Marché ou réglage"),
         p("Prix poussin", "FCFA", "350", "Marché ou réglage"),
         p("Taux éclosion", "%", "82", "Réglage couvoir"),
         p("Coût incubation/œuf", "FCFA", "15", "Réglage")],
        ["Marge œuf vs poussin", "% à incuber conseillé"]),

    blk("vet_comparison", BOTH, "analytique",
        "Comparer les vétérinaires (même intervention)",
        "Pour la même maladie ou vaccin : qui coûte moins cher ? Qui guérit plus vite ?",
        """Par type d'intervention :
  coût moyen par vétérinaire
  jours avant animal « sain »

Insight si écart coût ≥ 5 % ou guérison ≥ 2 jours""",
        [p("Interventions réalisées", "—", "—", "Module Santé"),
         p("Liste vétérinaires", "—", "—", "Référentiel véto")],
        ["Classement coût", "Classement délai guérison"]),

    blk("feed_inflation", BOTH, "analytique",
        "Aliment plus cher qu'avant ?",
        "Compare prix d'achat aliment des 30 derniers jours vs les 30 jours d'avant. Alerte si +10 %.",
        """Prix moyen/kg période récente vs période précédente

Hausse % = (récent − ancien) ÷ ancien × 100

Alerte si ≥ 10 % (critique si ≥ 15 %)""",
        [p("Achats aliment", "—", "—", "Alimentation / Achats")],
        ["Hausse %", "Prix/kg avant et après"]),

    blk("feed_supplier_ranking", CENTRE, "analytique",
        "Quel fournisseur d'aliment est le moins cher ?",
        "Même produit, plusieurs fournisseurs : écart de prix et alerte si spread ≥ 5 %.",
        """Prix moyen/kg par fournisseur et par type d'aliment
Écart % entre le moins cher et le plus cher""",
        [p("Fournisseurs", "liste", "—", "Module Achats"),
         p("Historique achats", "—", "—", "Alimentation")],
        ["Classement fournisseurs", "Alertes écart prix"]),

    blk("seasonality_weather", OBJ, "analytique",
        "Chaleur d'avril-mai et baisse de ponte",
        "Historique : en saison chaude, la ponte baisse souvent. Alerte si chaleur actuelle ≥ 35 °C.",
        """Par mois : taux ponte moyen
Compare mois chauds (avr–mai) vs autres mois

Alerte si baisse saisonnière ≥ 5 points ou canicule actuelle""",
        [p("Météo", "°C", "—", "Météo ferme"),
         p("Historique ponte", "—", "—", "Production")],
        ["Baisse saison %", "Conseils brumisation"]),

    blk("client_quality", OBJ, "analytique",
        "Client exigeant qui paie peu",
        "Client demandant tri strict ou gros calibre pour un petit supplément → rentabilité faible.",
        """Prix unitaire = montant commande ÷ quantité

Si exigence « tri strict » et prix unitaire bas → alerte rentabilité""",
        [p("Commandes clients", "—", "—", "Module Ventes"),
         p("Fiches clients", "—", "—", "Module Clients")],
        ["Classement clients", "Alertes mauvaise marge"]),

    blk("maraichage_biomass", BOTH, "analytique",
        "Fumier et litière = engrais gratuit",
        "Estime kg de fumier/litière par an et équivalent sacs NPK économisés pour le maraîchage.",
        """Litière pondeuses ≈ 0,08 kg/j/poule × 365
Fumier bovins ≈ 15 kg/j/bête × 365

Sacs NPK économisés = total kg ÷ 50
Économie = sacs × prix sac (15 000 F par défaut)""",
        [p("Prix sac NPK", "FCFA", "15 000", "Paramètres pilotage"),
         p("Poids sac", "kg", "50", "Standard")],
        ["Économie engrais FCFA", "Simulation cultures"]),

    blk("maraichage_sandbox", OBJ, "analytique",
        "Simulateur parcelle maraîchage",
        "Entrez charges, rendement et prix marché → marge estimée et quantité minimum à vendre pour être rentable.",
        """Coût total = charges fixes + charges extra + rendement × coût/kg

Recette = rendement × prix marché
Marge = recette − coût

Seuil rentabilité kg = coût total ÷ (prix − coût/kg)""",
        [p("Charges fixes", "FCFA", "0", "Saisie simulateur"),
         p("Rendement", "kg", "—", "Saisie simulateur"),
         p("Coût production/kg", "FCFA", "400", "Saisie simulateur")],
        ["Marge scénario A/B", "Kg minimum rentable"]),

    blk("charts_g1_g7", OBJ, "graphiques",
        "Graphiques Objectifs (G1 à G7)",
        "Courbes du module Objectifs : ponte, lots, seuil rentabilité, âge bandes, trésorerie, jauge objectif annuel, prix vs coût.",
        """G1 : ponte réelle vs catalogue race
G2 : comparer les lots
G3 : ventes du mois vs seuil rentabilité
G4 : âge des bandes (J+ = jours depuis le début)
G5 : flux trésorerie
G6 : % objectif annuel atteint
G7 : coût revient vs marché vs prix pratiqué""",
        [p("Données graphiques", "—", "—", "Module Objectifs → onglet Graphiques")],
        ["Courbes G1–G7"]),

    blk("charts_centre", CENTRE, "graphiques",
        "Graphiques du Centre décisionnel",
        "Ponte vs aliment, indice consommation chair, croissance bovins, niveau silo, maraîchage.",
        """• Ponte (% ) et kg aliment/j
• Indice consommation par lot chair
• Prise de poids bovins
• Jours restants silo
• Simulateur maraîchage""",
        [p("Journal ponte", "—", "—", "Production"),
         p("Seuil silo critique", "jours", "5", "Réglage Centre")],
        ["Graphiques Centre"]),

    blk("technical_farming", CENTRE, "pilotage",
        "Alertes du quotidien (technique)",
        "Rappels concrets : stock bas, santé, capteurs, anomalies de saisie — issus des règles métier de la ferme.",
        """Le système scanne lots, animaux, stocks, santé, capteurs.

Gravité :
• critique → à traiter tout de suite
• warning → à planifier""",
        [p("Capteurs (température…)", "—", "—", "IoT si installé"),
         p("Événements saisis", "—", "—", "Journal ERP")],
        ["Liste alertes", "Actions proposées"]),
]

header = """/** Annexe — explications simples des calculs (Centre + Objectifs). */

import { DEFAULT_PILOTAGE_SETTINGS, normalizePilotageSettings } from './pilotageSettingsService.js';
import { HIJRI_FESTIVAL_RULES } from './islamicCalendarEngine.js';

const arr = (v) => (Array.isArray(v) ? v : []);

/** Catégories affichées dans l'Annexe. */
export const FORMULA_CATEGORIES = [
  { id: 'calendrier', label: 'Dates & fêtes' },
  { id: 'commerce', label: 'Objectifs de vente' },
  { id: 'demande', label: 'Demande & stock disponible' },
  { id: 'zootechnie', label: 'Performance des animaux' },
  { id: 'couts', label: 'Coûts & bénéfices' },
  { id: 'flux', label: 'Aliment, bâtiments & trésorerie' },
  { id: 'prix', label: 'Prix de vente conseillés' },
  { id: 'analytique', label: 'Comparaisons & alertes' },
  { id: 'graphiques', label: 'Courbes du tableau de bord' },
  { id: 'pilotage', label: 'Réglages & alertes du quotidien' },
];

/** Sigles et mots — lire en premier. */
export const ACRONYM_GLOSSARY = [
  { term: 'J+40, J+90…', definition: 'Nombre de jours depuis le début de la bande ou l\\'entrée des animaux. J+40 = 40 jours après le lancement. J+90 = environ 3 mois d\\'élevage.' },
  { term: 'BFR', definition: 'Besoin en fonds de roulement : avez-vous assez d\\'argent (caisse + factures clients à encaisser) pour payer l\\'aliment du prochain cycle avant d\\'être payé vous-même ?' },
  { term: 'ITH', definition: 'Indice chaleur ressentie = température (°C) + humidité (%). Au-dessus de 29, les animaux souffrent et mangent mal.' },
  { term: 'IC (indice consommation)', definition: 'Kilos d\\'aliment nécessaires pour produire 1 kg de poulet. Exemple : 1,8 = 1,8 kg d\\'aliment pour 1 kg de viande. Cible chair : 1,6 à 1,9.' },
  { term: 'GMQ / prise de poids', definition: 'Combien l\\'animal grossit par jour (grammes ou kg). Sert à savoir s\\'il vaut encore la peine de le nourrir.' },
  { term: 'MCA / marge aliment', definition: 'Ce qu\\'il reste après avoir payé uniquement l\\'aliment : ventes − coût aliment.' },
  { term: 'Point mort', definition: 'Chiffre d\\'affaires minimum du mois pour couvrir toutes les charges (salaires, achats, etc.). En dessous, vous perdez de l'argent.' },
  { term: 'Vide sanitaire', definition: 'Pause sans animaux dans le bâtiment (souvent 10 jours) pour nettoyer et désinfecter entre deux bandes.' },
  { term: 'Date pivot / date limite', definition: 'Dernière date pour lancer ou acheter afin d\\'être prêt à vendre avant une fête (Tabaski, Korité…).' },
  { term: 'Taux de ponte', definition: 'Pourcentage de poules qui pondent chaque jour (ex. 85 % = 85 poules sur 100 ont pondu).' },
  { term: 'Souche / race', definition: 'Type de poules ou animaux achetés (ex. Novogen, Lohmann) avec une fiche performance (ponte, poids attendus).' },
  { term: 'Effet ciseau', definition: 'Quand le prix de l\\'aliment monte vite alors que le prix de vente de la viande ne suit pas — marge compressée.' },
  { term: 'Couverture %', definition: 'Pourcentage : est-ce que votre stock ou votre argent suffit par rapport à l\\'objectif ou au coût du cycle ? 100 % = juste assez. 50 % = il manque la moitié.' },
  { term: 'Catalogue race / objectif catalogue', definition: 'Fiche de référence du fabricant : à tel âge, la race devrait peser X ou pondre Y %.' },
  { term: 'Client VIP (BFR)', definition: 'Gros client dont l\\'encaissement proche est compté dans l\\'argent disponible pour lancer une bande.' },
];

/** Rappels courts par thème. */
export const DECISION_METHODOLOGY_SECTIONS = [
  { id: 'calendrier', title: 'Fêtes & dates', items: ['Les dates de Tabaski, Korité, Magal… sont calculées automatiquement.', 'Vous pouvez les corriger manuellement dans Paramètres pilotage si besoin.'] },
  { id: 'quand-vendre', title: 'Quand vendre ?', items: ['Si le coût aliment du jour dépasse le gain de poids du jour → vendre.', 'Bœufs : module Animaux · Poulets : module Avicole.'] },
  { id: 'quand-lancer', title: 'Quand lancer une bande ?', items: ['Date limite = date de la fête − durée du cycle (90 j bœuf, 40 j poulet).', 'Alerte rouge si la date est passée et qu\\'il n\\'y a rien en production.'] },
  { id: 'bfr', title: 'Argent pour l\\'aliment (BFR)', items: ['On compare trésorerie + factures VIP à payer vs coût aliment du cycle.', 'Si couverture < 50 % → ne pas lancer (réglable).'] },
  { id: 'demande', title: 'Demande clients', items: ['Estime les ventes du mois (saison + fêtes) et vérifie si vous avez assez de stock ou production.'] },
  { id: 'zootechnical', title: 'Performance vs race', items: ['Compare ponte ou poids réels à la fiche de la race achetée.'] },
  { id: 'break_even', title: 'Seuil de rentabilité', items: ['Montant minimum à vendre ce mois pour payer charges fixes et variables.'] },
  { id: 'stock_audit', title: 'Coulage aliment ?', items: ['Si le silo sort plus d\\'aliment que les animaux ne devraient manger → alerte par bâtiment.'] },
  { id: 'couts', title: 'Coût de revient', items: ['Achats + aliment + santé + frais = coût total. Marge = vente − coût.'] },
  { id: 'prix', title: 'Prix conseillé', items: ['Ne jamais vendre sous le coût + marge minimum. Tenir compte du marché local et de la saison.'] },
];

export const FORMULA_BLOCKS = [
"""

def render_block(b):
    lines = [
        "  {",
        f"    id: {json.dumps(b['id'], ensure_ascii=False)},",
        f"    modules: {json.dumps(b['modules'])},",
        f"    category: {json.dumps(b['category'], ensure_ascii=False)},",
        f"    title: {json.dumps(b['title'], ensure_ascii=False)},",
        f"    summary: {json.dumps(b['summary'], ensure_ascii=False)},",
        f"    formula: {json.dumps(b['formula'], ensure_ascii=False)},",
        "    parameters: [",
    ]
    for row in b["parameters"]:
        lines.append(
            "      { "
            + f"label: {json.dumps(row['label'], ensure_ascii=False)}, "
            + f"unit: {json.dumps(row['unit'], ensure_ascii=False)}, "
            + f"default: {json.dumps(row['default'], ensure_ascii=False)}, "
            + f"where: {json.dumps(row['where'], ensure_ascii=False)} "
            + "},"
        )
    lines.append("    ],")
    lines.append(f"    outputs: {json.dumps(b['outputs'], ensure_ascii=False)},")
    lines.append("  },")
    return "\n".join(lines)

footer = """
export const ENTITY_GLOSSARY = ACRONYM_GLOSSARY;

export const PILOTAGE_PARAM_ROWS = [
  { key: 'sanitary_min_days', label: 'Pause minimum entre bandes', unit: 'jours' },
  { key: 'mortality_threshold_pct', label: 'Mortalité max bande précédente', unit: '%' },
  { key: 'extra_vacuum_days', label: 'Jours en plus si maladie', unit: 'jours' },
  { key: 'next_band_size', label: 'Taille prochaine bande', unit: 'sujets' },
  { key: 'bfr_min_coverage_pct', label: 'Couverture trésorerie minimum', unit: '%' },
  { key: 'ith_stress_threshold', label: 'Seuil chaleur (ITH)', unit: '—' },
];

const FESTIVAL_PARAM_ROWS = Object.entries(HIJRI_FESTIVAL_RULES).map(([key, rule]) => ({
  key,
  label: rule.label,
  rule: `${rule.day} / mois hijri ${rule.month}`,
}));

export function buildAnnexeSnapshot(dataMap = {}) {
  const settings = normalizePilotageSettings(dataMap.growth_settings || DEFAULT_PILOTAGE_SETTINGS);
  return {
    pilotage: PILOTAGE_PARAM_ROWS.map((row) => ({
      ...row,
      value: settings[row.key],
      default: DEFAULT_PILOTAGE_SETTINGS[row.key],
    })),
    festivals: FESTIVAL_PARAM_ROWS,
    growthSettings: {
      annual_ca_target: settings.annual_ca_target || dataMap.growth_settings?.annual_ca_target || 'Business plan',
      target_gross_margin_pct: dataMap.growth_settings?.target_gross_margin_pct ?? 35,
      target_net_margin_pct: dataMap.growth_settings?.target_net_margin_pct ?? 12,
      vip_count: arr(settings.vip_client_ids).length,
    },
  };
}

export function formulasForModule(moduleId = 'centre_ia') {
  return FORMULA_BLOCKS.filter((block) => block.modules.includes(moduleId));
}

export function formulasGroupedByCategory(moduleId = 'centre_ia') {
  const formulas = formulasForModule(moduleId);
  const groups = new Map();
  formulas.forEach((block) => {
    const cat = block.category || 'autre';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(block);
  });
  return FORMULA_CATEGORIES
    .filter((cat) => groups.has(cat.id))
    .map((cat) => ({ ...cat, blocks: groups.get(cat.id) }));
}

export default FORMULA_BLOCKS;
"""

out = Path("/workspace/src/services/decisionMethodology.js")
out.write_text(header + "\n".join(render_block(b) for b in blocks) + "\n];\n" + footer, encoding="utf-8")
print(f"Wrote {len(blocks)} plain-language blocks")

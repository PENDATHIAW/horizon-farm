import { MODULE_TARGET_TABS, MODULE_AUDIT_ORDER } from '../../config/horizonVision.config.js';
import { NAV_MODULE_ORDER, ADVANCED_MODULE_IDS, GRAND_MODULE_IDS } from '../../config/modules.config.js';

/** Audit ERP UX — doublons navigation, modules hors vision, onglets orphelins. */
export function evaluateErpUxAuditRules() {
  const findings = [];
  const visionSet = new Set(MODULE_AUDIT_ORDER);
  const navOutsideVision = NAV_MODULE_ORDER.filter((id) => !visionSet.has(id) && id !== 'centre_ia' && id !== 'impact_business' && id !== 'cultures' && id !== 'agri_feeds' && id !== 'equipements' && id !== 'smartfarm' && id !== 'sync_activity');

  GRAND_MODULE_IDS.forEach((grandId) => {
    const advancedOverlap = ADVANCED_MODULE_IDS.filter((adv) => {
      const map = { animaux: 'elevage', avicole: 'elevage', sante: 'elevage', ventes: 'commercial', stock: 'achats_stock', finances: 'finance_pilotage', alertes: 'activite_suivi', taches: 'activite_suivi' };
      return map[adv] === grandId;
    });
    if (advancedOverlap.length >= 3) {
      findings.push({
        id: `ux-dup-grand-${grandId}`,
        module: grandId,
        severity: 'moyenne',
        category: 'audit_erp',
        title: `Doublons fonctionnels : ${grandId}`,
        description: `Routes avancées parallèles : ${advancedOverlap.join(', ')}`,
        recommended_action: 'Utiliser le grand module ; garder routes avancées en moteurs internes seulement',
        confidence_score: 0.88,
        auto_action: 'create_alert',
      });
    }
  });

  MODULE_AUDIT_ORDER.forEach((moduleId) => {
    const tabs = MODULE_TARGET_TABS[moduleId] || [];
    if (!tabs.length) {
      findings.push({
        id: `ux-no-tabs-${moduleId}`,
        module: moduleId,
        severity: 'haute',
        category: 'audit_erp',
        title: `Module sans onglets cibles : ${moduleId}`,
        description: 'MODULE_TARGET_TABS manquant',
        recommended_action: 'Définir la structure onglets vision',
        confidence_score: 0.95,
        auto_action: 'create_task',
      });
    }
  });

  if (navOutsideVision.length) {
    findings.push({
      id: 'ux-nav-extra',
      module: 'gestion_systeme',
      severity: 'basse',
      category: 'audit_erp',
      title: 'Modules nav hors pack vision principal',
      description: navOutsideVision.join(', '),
      recommended_action: 'Vérifier que ces entrées restent des raccourcis moteurs, pas des doublons',
      confidence_score: 0.75,
    });
  }

  return findings;
}

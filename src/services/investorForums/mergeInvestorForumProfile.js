/**
 * Fusion profil auto (ERP) + contenu manuel éditable — ne modifie jamais keyFigures / investorReady.
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const lines = (text = '') => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);

export const EMPTY_MANUAL_CONTENT = {
  project_pitch: '',
  vision: '',
  mission: '',
  founder_name: '',
  founder_role: '',
  founder_highlights: '',
  founder_story: '',
  founder_cv: '',
  founder_education: '',
  founder_experience: '',
  founder_skills: '',
  founder_photo_url: '',
  location: '',
  project_status: '',
  activities_notes: '',
  needs_notes: '',
  impact_securite: '',
  impact_emplois: '',
  impact_femmes: '',
  impact_formalisation: '',
  impact_community: '',
  risks_notes: '',
  objectives_6m: '',
  objectives_12m: '',
  objectives_3y: '',
  ai_headline: '',
  ai_differentiator: '',
  ai_modules: '',
  why_invest: [],
  seeking: {},
  timeline: [],
  field_priorities: {},
  audience_messages: {},
  dossier_status: 'brouillon',
};

export function manualContentFromRow(row = {}) {
  const raw = row?.manual_content || row?.manualContent || {};
  return { ...EMPTY_MANUAL_CONTENT, ...(typeof raw === 'object' ? raw : {}) };
}

/**
 * @param {object} autoProfile — buildInvestorForumProfile()
 * @param {object} manual — contenu éditable uniquement
 */
export function mergeInvestorForumProfile(autoProfile = {}, manual = {}) {
  const m = { ...EMPTY_MANUAL_CONTENT, ...manual };
  const merged = {
    ...autoProfile,
    readOnly: false,
    manualContent: m,
    dossierStatus: m.dossier_status || 'brouillon',
    objectives: {
      sixMonths: m.objectives_6m || '',
      twelveMonths: m.objectives_12m || '',
      threeYears: m.objectives_3y || '',
    },
    projectSummary: {
      ...autoProfile.projectSummary,
      pitch: m.project_pitch || autoProfile.projectSummary?.pitch,
      vision: m.vision || autoProfile.projectSummary?.vision || '',
      mission: m.mission || autoProfile.projectSummary?.mission || '',
      location: m.location || autoProfile.projectSummary?.location,
      legalStatus: m.project_status || autoProfile.projectSummary?.legalStatus,
      activities: m.activities_notes
        ? lines(m.activities_notes)
        : autoProfile.projectSummary?.activities,
    },
    founderProfile: {
      ...autoProfile.founderProfile,
      name: m.founder_name || autoProfile.founderProfile?.name,
      role: m.founder_role || autoProfile.founderProfile?.role,
      highlights: m.founder_highlights
        ? lines(m.founder_highlights)
        : autoProfile.founderProfile?.highlights,
      story: m.founder_story || '',
      cv: m.founder_cv || '',
      education: m.founder_education || '',
      experience: m.founder_experience || '',
      skills: m.founder_skills || '',
      photoUrl: m.founder_photo_url || '',
    },
    investorRoom: {
      whyInvest: arr(m.why_invest),
      seeking: m.seeking && typeof m.seeking === 'object' ? m.seeking : {},
      timeline: arr(m.timeline),
      fieldPriorities: m.field_priorities && typeof m.field_priorities === 'object' ? m.field_priorities : {},
    },
    socialImpact: {
      ...autoProfile.socialImpact,
      securite_alimentaire: m.impact_securite || autoProfile.socialImpact?.securite_alimentaire,
      emplois_prevus: m.impact_emplois ? m.impact_emplois : autoProfile.socialImpact?.emplois_prevus,
      femmes_jeunes: m.impact_femmes || autoProfile.socialImpact?.femmes_jeunes,
      formalisation: m.impact_formalisation || autoProfile.socialImpact?.formalisation,
      community: m.impact_community || autoProfile.socialImpact?.community,
    },
    needsSought: mergeNeeds(autoProfile.needsSought, m.needs_notes),
    risksMitigation: mergeRisks(autoProfile.risksMitigation, m.risks_notes),
    aiInnovation: {
      ...autoProfile.aiInnovation,
      headline: m.ai_headline || autoProfile.aiInnovation?.headline,
      differentiator: m.ai_differentiator || autoProfile.aiInnovation?.differentiator,
      modules: m.ai_modules
        ? lines(m.ai_modules)
        : autoProfile.aiInnovation?.modules,
    },
    audienceMessages: m.audience_messages || {},
  };

  return merged;
}

function mergeNeeds(autoNeeds = [], notes = '') {
  const extra = lines(notes).map((line, index) => ({
    id: `manual-need-${index}`,
    label: line.split('—')[0]?.trim() || line.slice(0, 60),
    detail: line.includes('—') ? line.split('—').slice(1).join('—').trim() : line,
    priority: 'moyenne',
  }));
  if (!extra.length) return autoNeeds;
  return [...extra, ...arr(autoNeeds)].slice(0, 12);
}

function mergeRisks(autoRisks = [], notes = '') {
  const extra = lines(notes).map((line, index) => ({
    id: `manual-risk-${index}`,
    label: line.split('→')[0]?.trim() || line.slice(0, 60),
    detail: line,
    mitigation: line.includes('→') ? line.split('→').slice(1).join('→').trim() : 'Plan de mitigation à documenter',
    severity: 'info',
  }));
  if (!extra.length) return autoRisks;
  return [...extra, ...arr(autoRisks)].slice(0, 12);
}

export default mergeInvestorForumProfile;

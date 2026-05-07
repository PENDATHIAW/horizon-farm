import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'horizon-farm-automation-settings';

export const defaultAutomationSettings = [
  {
    id: 'relances_clients',
    key: 'relances_clients',
    label: 'Relances clients',
    description: 'Rappel commandes en attente',
    enabled: true,
    category: 'whatsapp',
    frequency: 'quotidien',
    message_template: 'Bonjour {nom}, souhaitez-vous renouveler votre commande Horizon Farm ?',
    audience: 'clients_a_relancer',
  },
  {
    id: 'confirmations_ventes',
    key: 'confirmations_ventes',
    label: 'Confirmations ventes',
    description: 'Ticket automatique post-vente',
    enabled: true,
    category: 'whatsapp',
    frequency: 'apres_vente',
    message_template: 'Merci {nom}, votre commande Horizon Farm est confirmee.',
    audience: 'clients_actifs',
  },
  {
    id: 'rapports_production',
    key: 'rapports_production',
    label: 'Rapports production',
    description: 'Rapport hebdo pondeuses',
    enabled: false,
    category: 'whatsapp',
    frequency: 'hebdomadaire',
    message_template: 'Rapport production disponible: {resume}.',
    audience: 'manager',
  },
  {
    id: 'promotions_grossistes',
    key: 'promotions_grossistes',
    label: 'Promotions',
    description: 'Offres speciales grossistes',
    enabled: false,
    category: 'whatsapp',
    frequency: 'mensuel',
    message_template: 'Offre Horizon Farm pour grossistes: {offre}.',
    audience: 'grossistes',
  },
];

export const automationSettingsService = {
  async getAll() {
    const { data, error } = await supabase.from('automation_settings').select('*').eq('category', 'whatsapp');
    if (error) {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
      return defaultAutomationSettings;
    }
    return data || [];
  },

  async upsert(setting) {
    const { data, error } = await supabase
      .from('automation_settings')
      .upsert(setting, { onConflict: 'key' })
      .select('*')
      .single();
    if (error) {
      const cached = localStorage.getItem(STORAGE_KEY);
      const current = cached ? JSON.parse(cached) : defaultAutomationSettings;
      const next = current.some((item) => item.key === setting.key)
        ? current.map((item) => (item.key === setting.key ? setting : item))
        : [...current, setting];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return setting;
    }
    return data;
  },
};

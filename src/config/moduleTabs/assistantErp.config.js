import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('assistant_erp', labels.assistant_erp, [
  { id: 'conversation', component: 'Conversation', aliases: ['Hey Horizon', 'Questions metier', 'Aide a la decision', 'Recherche dans les donnees'] },
  { id: 'actions-cles', component: 'Actions clés', aliases: ['Actions', 'Raccourcis', 'Gestes clés', 'Centre de commande'] },
], 'assistant_erp');

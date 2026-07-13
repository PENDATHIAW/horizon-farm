import labels from '../../i18n/fr/moduleTabs.js';
import { defineModuleTabs } from './shared.js';

export default defineModuleTabs('assistant_erp', labels.assistant_erp, [
  { id: 'conversation', component: 'Conversation', aliases: ['Hey Horizon', 'Questions metier', 'Aide a la decision', 'Recherche dans les donnees'] },
], 'assistant_erp');

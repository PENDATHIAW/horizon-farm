import { TrendingDown, TrendingUp } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { FINANCE_STAT_GRID, FinanceKpi, FinanceSection } from './financeUi.jsx';

export default function FinanceRentabilitePanel({ data, onNavigate, setTab }) {
  const marginTone = data.margin >= 0 ? 'good' : 'bad';

  return (
    <div className="space-y-4">
      <div className={FINANCE_STAT_GRID}>
        <FinanceKpi label="Marge nette" value={fmtCurrency(data.margin)} tone={marginTone} />
        <FinanceKpi label="Recettes" value={fmtCurrency(data.income)} tone="good" onClick={() => setTab?.('Trésorerie')} />
        <FinanceKpi label="Dépenses" value={fmtCurrency(data.expenses)} tone="warn" onClick={() => setTab?.('Trésorerie')} />
        <FinanceKpi
          label="Alertes renta."
          value={fmtNumber(data.profitAlerts?.length || 0)}
          tone={data.profitAlerts?.length ? 'warn' : 'good'}
        />
      </div>

      <FinanceSection
        title="Lecture rapide"
        subtitle="Rentabilité consolidée — analyses détaillées sur Centre décisionnel et Objectifs & Croissance."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('centre_ia', { tab: 'Performance' })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-2.5 text-sm font-black text-[#2f2415]"
          >
            {data.margin >= 0 ? <TrendingUp size={14} className="text-emerald-600" /> : <TrendingDown size={14} className="text-red-600" />}
            Centre décisionnel
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Financeurs' })}
            className="rounded-xl border border-[#eadcc2] bg-white px-4 py-2.5 text-sm font-black text-[#2f2415]"
          >
            Objectifs & financeurs
          </button>
        </div>
      </FinanceSection>

      <ModuleListHub
        title="Alertes de rentabilité"
        intro="Marges, charges et signaux détectés par le moteur ERP."
        stats={[
          { label: 'Marge nette', value: fmtCurrency(data.margin), tone: marginTone },
          { label: 'Recettes', value: fmtCurrency(data.income), tone: 'good' },
          { label: 'Dépenses', value: fmtCurrency(data.expenses), tone: 'warn' },
          { label: 'Alertes', value: fmtNumber(data.profitAlerts?.length || 0), tone: data.profitAlerts?.length ? 'warn' : 'good' },
        ]}
        rows={(data.profitAlerts || []).map((row) => ({
          id: row.id || row.title,
          title: row.title,
          detail: row.detail || row.recommended_action || row.description || '—',
          value: row.level || row.severity || 'Alerte',
          module: row.module || 'finance_pilotage',
          tab: row.module === 'commercial' ? 'Clients' : 'Rentabilité',
        }))}
        emptyLabel="Aucune alerte de rentabilité détectée."
        onNavigate={(module, opts) => {
          if (module === 'finance_pilotage') setTab?.(opts?.tab || 'Rentabilité');
          else onNavigate?.(module, opts);
        }}
      />
    </div>
  );
}

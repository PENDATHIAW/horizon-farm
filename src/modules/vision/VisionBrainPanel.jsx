import { BrainCircuit, ShieldAlert, Sprout, TrendingUp, WalletCards } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);

function pickBrainDecision(data = {}) {
  const treasury = data.treasuryResult ?? data.balance ?? 0;
  const criticalRisk = arr(data.risks).find((risk) => risk.tone === 'bad');
  const firstPriority = arr(data.priorities)[0];
  const firstOpportunity = arr(data.openOpportunities)[0];

  if (criticalRisk) {
    return {
      tone: 'bad',
      title: 'Sécuriser maintenant',
      detail: criticalRisk.title,
      action: 'Voir efficacité',
      target: { type: 'tab', tab: 'Efficacité' },
    };
  }
  if ((data.receivable || 0) > 0) {
    return {
      tone: 'warn',
      title: 'Récupérer le cash',
      detail: `${fmtCurrency(data.receivable)} à encaisser chez les clients.`,
      action: 'Relancer clients',
      target: { type: 'module', module: 'commercial', tab: 'Clients' },
    };
  }
  if (treasury < 0) {
    return {
      tone: 'bad',
      title: 'Stabiliser la trésorerie',
      detail: `Résultat ${fmtCurrency(treasury)} sur la période.`,
      action: 'Voir trésorerie',
      target: { type: 'module', module: 'finance_pilotage', tab: 'Trésorerie' },
    };
  }
  if (firstPriority) {
    return {
      tone: firstPriority.tone || 'warn',
      title: 'Traiter le signal prioritaire',
      detail: firstPriority.title,
      action: 'Voir priorité',
      target: { type: 'tab', tab: firstPriority.tab || 'Rentabilité lots' },
    };
  }
  if (firstOpportunity) {
    return {
      tone: 'good',
      title: 'Transformer une opportunité',
      detail: firstOpportunity.title || firstOpportunity.nom || 'Pipeline commercial ouvert.',
      action: 'Voir opportunités',
      target: { type: 'tab', tab: 'Opportunités' },
    };
  }
  return {
    tone: 'good',
    title: 'Exploitation stable',
    detail: 'Aucun signal critique. Continuez la saisie terrain pour garder le cerveau à jour.',
    action: 'Voir graphiques',
    target: { type: 'tab', tab: 'Graphiques' },
  };
}

function toneClasses(tone = 'neutral') {
  if (tone === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'bad') return 'border-red-200 bg-red-50 text-red-800';
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]';
}

function BrainLever({ icon: Icon, title, value, detail, tone = 'neutral', onClick, action }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-[#eadcc2] bg-white p-4 text-left shadow-sm transition hover:border-[#c9a96a] hover:bg-[#fffdf8]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-2 text-[#9a6b12]"><Icon size={18} /></span>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${toneClasses(tone)}`}>{action}</span>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-[#8a7456]">{title}</p>
      <p className="mt-1 text-xl font-black text-[#2f2415]">{value}</p>
      <p className="mt-1 text-xs leading-snug text-[#8a7456]">{detail}</p>
    </button>
  );
}

export default function VisionBrainPanel({ data = {}, setTab, onNavigate }) {
  const decision = pickBrainDecision(data);
  const health = data.healthScore ?? data.globalScore ?? 100;
  const treasury = data.treasuryResult ?? data.balance ?? 0;
  const criticalRisks = arr(data.risks).filter((risk) => risk.tone === 'bad').length;
  const actionCount = arr(data.priorities).length;
  const openOpps = arr(data.openOpportunities).length;

  const followDecision = () => {
    if (decision.target?.type === 'module') {
      onNavigate?.(decision.target.module, { tab: decision.target.tab });
      return;
    }
    setTab?.(decision.target?.tab || 'Rentabilité lots');
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#2f2415] p-5 text-white shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#facc15]"><BrainCircuit size={18} /> Cerveau Horizon</p>
          <h2 className="mt-3 text-2xl font-black">{decision.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#f6ead4]">{decision.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-black">Santé {health}/100</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-black">{fmtNumber(actionCount)} action(s)</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-black">{fmtNumber(criticalRisks)} critique(s)</span>
          </div>
          <button type="button" onClick={followDecision} className="mt-5 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16] hover:bg-[#86efac]">
            {decision.action}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BrainLever
            icon={WalletCards}
            title="Encaisser"
            value={fmtCurrency(data.receivable || 0)}
            detail={`Trésorerie ${fmtCurrency(treasury)}.`}
            tone={(data.receivable || 0) > 0 || treasury < 0 ? 'warn' : 'good'}
            action="Cash"
            onClick={() => onNavigate?.('commercial', { tab: 'Clients' })}
          />
          <BrainLever
            icon={ShieldAlert}
            title="Protéger"
            value={fmtNumber(arr(data.risks).length)}
            detail={`${criticalRisks} risque(s) critique(s), ${data.missingProof || 0} preuve(s) manquante(s).`}
            tone={criticalRisks ? 'bad' : arr(data.risks).length ? 'warn' : 'good'}
            action="Efficacité"
            onClick={() => setTab?.('Efficacité')}
          />
          <BrainLever
            icon={Sprout}
            title="Produire"
            value={fmtNumber((data.lots?.length || 0) + (data.animaux?.length || 0))}
            detail={`${fmtNumber(data.criticalStockCount || 0)} stock(s) sous seuil, cycles à piloter.`}
            tone={data.criticalStockCount ? 'warn' : 'neutral'}
            action="Cycles"
            onClick={() => onNavigate?.('elevage', { tab: 'Cycles' })}
          />
          <BrainLever
            icon={TrendingUp}
            title="Croître"
            value={fmtCurrency(data.pipelineTotal || 0)}
            detail={`${fmtNumber(openOpps)} opportunité(s), objectifs dans Objectifs & Croissance.`}
            tone={openOpps ? 'good' : 'neutral'}
            action="Vendre"
            onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })}
          />
        </div>
      </div>
    </section>
  );
}

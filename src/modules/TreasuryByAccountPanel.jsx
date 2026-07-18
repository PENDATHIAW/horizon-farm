import { useMemo, useState } from 'react';
import { Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fmtCurrency } from '../utils/format';
import { buildOfficialTreasuryView } from '../utils/financePilotageCore.js';
import { buildTreasuryByAccount, buildTreasuryReconciliation } from '../utils/treasuryByAccount.js';
import { getRealBalances, saveRealBalances } from '../utils/treasurySettings.js';

/**
 * Trésorerie par compte + rapprochement avec les soldes réels.
 * La somme des comptes = trésorerie officielle (cashNet). Le rapprochement
 * compare le solde ERP au solde réel saisi et affiche l'écart, sans jamais
 * modifier les données métier.
 */
export default function TreasuryByAccountPanel(props) {
  const view = useMemo(() => buildOfficialTreasuryView(props), [props]);
  const treasury = useMemo(
    () => buildTreasuryByAccount({ consolidated: view.finance, payments: view.input.payments, transactions: view.input.transactions }),
    [view],
  );
  const [realBalances, setRealBalances] = useState(() => getRealBalances());

  const reconciliation = useMemo(() => buildTreasuryReconciliation(treasury, realBalances), [treasury, realBalances]);

  const onChange = (key, value) => {
    const next = { ...realBalances, [key]: value };
    setRealBalances(next);
    saveRealBalances(next);
  };

  const editable = reconciliation.accounts.filter((account) => account.key !== 'non_ventile');
  const nonVentile = reconciliation.accounts.find((account) => account.key === 'non_ventile');

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2">
            <Wallet size={15} /> Trésorerie par compte
          </p>
          <h3 className="text-xl font-semibold text-earth mt-1">Où est mon argent, et est-ce exact ?</h3>
          <p className="text-sm text-slate mt-1">
            La somme des comptes égale la trésorerie officielle ({fmtCurrency(treasury.cashNet)}). Saisissez le solde réel
            constaté (relevé Wave/OM, comptage caisse) pour vérifier l’alignement.
          </p>
        </div>
        {reconciliation.comptesControles > 0 ? (
          reconciliation.aligne ? (
            <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive flex items-center gap-2">
              <CheckCircle2 size={15} /> Aligné avec la réalité
            </div>
          ) : (
            <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark flex items-center gap-2">
              <AlertTriangle size={15} /> Écart total : {fmtCurrency(reconciliation.ecartTotal)}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-line bg-card p-3 text-sm text-slate">Saisir les soldes réels pour rapprocher</div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-normal text-slate">
              <th className="py-2 pr-3">Compte</th>
              <th className="py-2 px-3 text-right">Solde ERP</th>
              <th className="py-2 px-3 text-right">Solde réel</th>
              <th className="py-2 pl-3 text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {editable.map((account) => (
              <tr key={account.key} className="border-t border-line">
                <td className="py-2 pr-3 text-earth font-medium">{account.label}</td>
                <td className={`py-2 px-3 text-right tabular-nums ${account.net < 0 ? 'text-vigilance' : 'text-earth'}`}>{fmtCurrency(account.net)}</td>
                <td className="py-2 px-3 text-right">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={realBalances[account.key] ?? ''}
                    onChange={(event) => onChange(account.key, event.target.value)}
                    placeholder="-"
                    className="w-28 rounded-lg border border-line px-2 py-1 text-right text-sm focus:border-horizon focus:outline-none"
                    aria-label={`Solde réel ${account.label}`}
                  />
                </td>
                <td className={`py-2 pl-3 text-right tabular-nums ${account.ecart == null ? 'text-slate' : account.reconcilie ? 'text-positive' : 'text-vigilance'}`}>
                  {account.ecart == null ? '-' : fmtCurrency(account.ecart)}
                </td>
              </tr>
            ))}
            {nonVentile && Math.abs(nonVentile.net) >= 1 ? (
              <tr className="border-t border-line">
                <td className="py-2 pr-3 text-slate">{nonVentile.label}</td>
                <td className="py-2 px-3 text-right tabular-nums text-slate">{fmtCurrency(nonVentile.net)}</td>
                <td className="py-2 px-3" />
                <td className="py-2 pl-3" />
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-semibold text-earth">
              <td className="py-2 pr-3">Total (trésorerie officielle)</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtCurrency(treasury.cashNet)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{reconciliation.totalReel == null ? '-' : fmtCurrency(reconciliation.totalReel)}</td>
              <td className={`py-2 pl-3 text-right tabular-nums ${reconciliation.comptesControles ? (reconciliation.aligne ? 'text-positive' : 'text-vigilance') : 'text-slate'}`}>
                {reconciliation.comptesControles ? fmtCurrency(reconciliation.ecartTotal) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-meta text-slate">
        « {nonVentile?.label || 'Non ventilé'} » regroupe les ajustements de la consolidation (plafonnement, dédoublonnage,
        coûts métier non encore saisis en finance) pour que le total corresponde toujours au chiffre officiel. Les soldes
        réels sont conservés sur cet appareil ; aucune donnée métier n’est modifiée.
      </p>
    </section>
  );
}

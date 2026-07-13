import { AlertTriangle, CloudSun, Package } from 'lucide-react';
import Btn from '../../components/Btn';
import { fmtNumber } from '../../utils/format';

const toNumber = (value = 0) => Number(value || 0);
const lower = (value = '') => String(value || '').toLowerCase();
const isCultureInput = (row = {}) => {
  const text = lower(`${row.produit || ''} ${row.name || ''} ${row.nom || ''} ${row.categorie || ''} ${row.category || ''} ${row.type || ''}`);
  return ['semence', 'engrais', 'intrant', 'irrigation', 'eau', 'traitement', 'phytosanitaire', 'substrat', 'terreau', 'culture', 'maraichage', 'maraîchage'].some((word) => text.includes(word));
};
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const stockLabel = (row = {}) => row.produit || row.name || row.nom || row.id || 'Intrant';

function Mini({ label, value, danger = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}>
      <p className="text-xs text-slate">{label}</p>
      <b className="block text-earth break-words">{value}</b>
    </div>
  );
}

/** Intrants cultures (lecture stock) + météo contextuelle — pas de stock ici, uniquement utilisation via workflow Intrants. */
export default function CultureInputsWeatherPanel({ stocks = [], meteo = null, weatherLoading = false, onNavigate }) {
  const cultureInputs = stocks.filter(isCultureInput);
  const criticalInputs = cultureInputs.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  const readyInputs = cultureInputs.filter((row) => stockQty(row) > 0).slice(0, 4);
  const weatherLabel = meteo?.condition || meteo?.description || meteo?.weather || meteo?.summary || 'Météo non renseignée';
  const temp = meteo?.temperature ?? meteo?.temp ?? meteo?.current?.temperature ?? meteo?.main?.temp;
  const humidity = meteo?.humidity ?? meteo?.humidite ?? meteo?.current?.humidity;
  const rain = meteo?.rain ?? meteo?.pluie ?? meteo?.precipitation ?? meteo?.current?.precipitation;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      <article className="rounded-2xl border border-line bg-card p-4">
        <p className="flex items-center gap-2 font-semibold text-earth"><Package size={17} className="text-horizon-dark" /> Intrants cultures</p>
        <p className="mt-1 text-sm text-slate">Semences, engrais, traitements et irrigation — stock géré dans Achats & Stock.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Mini label="Intrants suivis" value={cultureInputs.length} />
          <Mini label="Sous seuil" value={criticalInputs.length} danger={criticalInputs.length > 0} />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {criticalInputs.slice(0, 3).map((row) => (
            <div key={row.id || stockLabel(row)} className="rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-horizon-dark">
              <AlertTriangle size={14} className="inline" /> {stockLabel(row)} · {fmtNumber(stockQty(row))} {row.unite || ''}
            </div>
          ))}
          {!criticalInputs.length ? <div className="rounded-xl border border-positive bg-positive-bg px-3 py-2 text-positive">Aucun intrant culture sous seuil.</div> : null}
        </div>
        <div className="mt-3 flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('achats_stock', { tab: 'Stock' })}>Ouvrir stock</Btn></div>
      </article>

      <article className="rounded-2xl border border-line bg-card p-4">
        <p className="flex items-center gap-2 font-semibold text-earth"><CloudSun size={17} className="text-horizon-dark" /> Météo (contexte actions)</p>
        <p className="mt-1 text-sm text-slate">Intégrée aux décisions irrigation et traitements — pas d&apos;onglet météo séparé.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Mini label="État" value={weatherLoading ? 'Chargement' : weatherLabel} />
          <Mini label="Température" value={temp !== undefined && temp !== null ? `${fmtNumber(temp)}°C` : '—'} />
          <Mini label="Humidité" value={humidity !== undefined && humidity !== null ? `${fmtNumber(humidity)}%` : '—'} />
          <Mini label="Pluie" value={rain !== undefined && rain !== null ? `${fmtNumber(rain)} mm` : '—'} />
        </div>
        <div className="mt-3 flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('smartfarm')}>Capteurs Smart Farm</Btn></div>
      </article>

      <article className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth">Intrants disponibles</p>
        <div className="mt-3 space-y-2 text-sm">
          {readyInputs.length ? readyInputs.map((row) => (
            <div key={row.id || stockLabel(row)} className="rounded-xl bg-white border border-line px-3 py-2">
              <b className="text-earth">{stockLabel(row)}</b>
              <p className="text-xs text-slate">{fmtNumber(stockQty(row))} {row.unite || ''} disponible(s)</p>
            </div>
          )) : <div className="rounded-xl border border-line bg-white px-3 py-2 text-slate">Aucun intrant culture identifié dans le stock.</div>}
        </div>
      </article>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  Camera, CloudSun, Droplets, FlaskConical, Gauge, MapPin, Power, Radio,
  Scale, ScanLine, ShieldAlert, Snowflake, Sprout, Sun, Thermometer, Waves, Wind, Zap,
} from 'lucide-react';
import { SMARTFARM_SIMULATED_FLEET, buildSimulatedFleetSummary } from '../../config/smartFarmSimulatedFleet.js';

const TYPE_META = {
  localisation: [MapPin, 'Localisation'],
  camera: [Camera, 'Caméra'],
  securite: [ShieldAlert, 'Sécurité'],
  temperature: [Thermometer, 'Température'],
  humidite: [Droplets, 'Humidité air'],
  humidite_sol: [Sprout, 'Humidité sol'],
  gaz: [Wind, 'Gaz / air'],
  aqua: [Waves, 'Eau (bassin)'],
  qualite: [FlaskConical, 'Qualité eau/sol'],
  niveau: [Gauge, 'Niveau'],
  debit: [Waves, 'Débit d’eau'],
  pression: [Gauge, 'Pression'],
  actionneur: [Power, 'Pilotage'],
  meteo: [CloudSun, 'Météo'],
  pesee: [Scale, 'Pesée'],
  analyse: [FlaskConical, 'Analyse'],
  lumiere: [Sun, 'Lumière'],
  froid: [Snowflake, 'Froid'],
  logistique: [ScanLine, 'Logistique'],
  energie: [Zap, 'Énergie'],
  capteur: [Radio, 'Capteur'],
};

function etatChip(device) {
  if (device.etat === 'hors_ligne') return { label: 'Hors ligne', cls: 'bg-neutral-bg text-slate' };
  if (device.etat === 'alerte') {
    if (device.gravite === 'urgence') return { label: 'Urgence', cls: 'bg-urgent-bg text-urgent' };
    if (device.gravite === 'critique') return { label: 'Critique', cls: 'bg-urgent-bg text-urgent' };
    return { label: 'Attention', cls: 'bg-vigilance-bg text-horizon-dark' };
  }
  return { label: 'RAS', cls: 'bg-positive-bg text-positive' };
}

const FILTERS = [
  { key: 'tous', label: 'Tout le parc' },
  { key: 'alerte', label: 'En alerte' },
  { key: 'hors_ligne', label: 'Hors ligne' },
];

function DeviceCard({ device }) {
  const [Icon, typeLabel] = TYPE_META[device.type] || TYPE_META.capteur;
  const chip = etatChip(device);
  const border = device.etat === 'alerte'
    ? (device.gravite === 'warning' ? 'border-vigilance' : 'border-urgent')
    : device.etat === 'hors_ligne' ? 'border-line' : 'border-line';
  return (
    <div className={`rounded-2xl border ${border} bg-white p-3 shadow-card`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-positive-bg text-leaf">
            <Icon size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-earth">{device.name}</p>
            <p className="text-meta text-slate">{typeLabel} · {device.zone}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {device.valeur != null ? (
            <p className="text-sm font-semibold text-earth tabular-nums">{device.valeur}{device.unite ? ` ${device.unite}` : ''}</p>
          ) : null}
          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-meta font-semibold ${chip.cls}`}>{chip.label}</span>
        </div>
      </div>
      <p className="mt-2 text-xs leading-snug text-slate">{device.apport}</p>
      {device.etat === 'alerte' ? (
        <p className={`mt-1 text-xs font-semibold ${device.gravite === 'warning' ? 'text-horizon-dark' : 'text-urgent'}`}>→ {device.action}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="rounded-full bg-card px-2 py-0.5 text-meta font-semibold text-slate">{device.tech}</span>
        <span className="rounded-full bg-card px-2 py-0.5 text-meta font-semibold text-slate">{device.priorite}</span>
      </div>
    </div>
  );
}

/**
 * Parc de capteurs simulé : montre, avant achat, l'apport concret des 86
 * équipements « intégration directe » du catalogue. Aucune donnée réelle —
 * au branchement, les vrais relevés remplaceront ces valeurs.
 */
export default function SmartFarmSimulationPanel({ fleet = SMARTFARM_SIMULATED_FLEET }) {
  const [filtre, setFiltre] = useState('tous');
  const summary = useMemo(() => buildSimulatedFleetSummary(fleet), [fleet]);

  const visibles = useMemo(() => {
    if (filtre === 'alerte') return fleet.filter((d) => d.etat === 'alerte');
    if (filtre === 'hors_ligne') return fleet.filter((d) => d.etat === 'hors_ligne');
    return fleet;
  }, [fleet, filtre]);

  const groupes = useMemo(() => {
    const map = new Map();
    // alertes d'abord dans chaque catégorie
    const ordre = { alerte: 0, hors_ligne: 1, ras: 2 };
    [...visibles].sort((a, b) => (ordre[a.etat] ?? 3) - (ordre[b.etat] ?? 3)).forEach((d) => {
      if (!map.has(d.categorie)) map.set(d.categorie, []);
      map.get(d.categorie).push(d);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const na = parseInt(a[0], 10); const nb = parseInt(b[0], 10);
      return na - nb;
    });
  }, [visibles]);

  const tiles = [
    { n: summary.total, l: 'Capteurs simulés' },
    { n: summary.actifs, l: 'Actifs (en ligne)' },
    { n: summary.alertes, l: 'Alertes & actions', tone: summary.alertes ? 'warn' : 'good' },
    { n: summary.zonesCount, l: 'Zones couvertes' },
  ];

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-card p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-horizon-dark" />
          <h2 className="text-lg font-semibold text-earth">Parc de capteurs : aperçu en simulation</h2>
        </div>
        <p className="text-sm text-slate">
          Les {summary.total} équipements « intégration directe » du catalogue, pour voir leur apport <b>avant achat</b>.
          Valeurs simulées : au branchement, les vrais relevés 4G les remplaceront automatiquement (même schéma).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="rounded-2xl border border-line bg-white p-3 shadow-card">
            <p className={`text-2xl font-semibold tabular-nums ${t.tone === 'warn' ? 'text-horizon-dark' : t.tone === 'good' ? 'text-positive' : 'text-earth'}`}>{t.n}</p>
            <p className="text-meta text-slate">{t.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === 'tous' ? summary.total : f.key === 'alerte' ? summary.alertes : summary.horsLigne;
          const active = filtre === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltre(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-earth text-white' : 'bg-white text-slate hover:bg-mist'}`}
            >
              {f.label} · {count}
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">Aucun capteur dans ce filtre : tout est au vert.</p>
      ) : (
        <div className="space-y-5">
          {groupes.map(([categorie, devices]) => (
            <div key={categorie} className="space-y-2">
              <p className="text-label font-semibold uppercase text-earth">{categorie}</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

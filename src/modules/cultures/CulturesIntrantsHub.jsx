import CultureInputsWeatherPanel from './CultureInputsWeatherPanel.jsx';
import CulturesTabActionsBridge from '../CulturesTabActionsBridge.jsx';
import useLiveWeather from '../../hooks/useLiveWeather';

export default function CulturesIntrantsHub(props) {
  const { weather: liveMeteo, loading: liveWeatherLoading } = useLiveWeather();
  const meteo = props.meteo || liveMeteo;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-earth">Intrants & météo</h2>
          <p className="mt-1 text-sm text-slate">
            Utilisation terrain uniquement - chaque intrant validé décrémente le stock et met à jour le coût culture (Finance).
          </p>
        </div>
        <CultureInputsWeatherPanel stocks={props.stocks} meteo={meteo} weatherLoading={liveWeatherLoading} onNavigate={props.onNavigate} />
      </section>
      <CulturesTabActionsBridge {...props} tab="Intrants & Météo" actionsMode="input" />
    </div>
  );
}

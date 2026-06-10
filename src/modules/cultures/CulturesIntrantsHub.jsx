import CultureInputsWeatherPanel from './CultureInputsWeatherPanel.jsx';
import CulturesTabActionsBridge from '../CulturesTabActionsBridge.jsx';
import useLiveWeather from '../../hooks/useLiveWeather';

export default function CulturesIntrantsHub(props) {
  const { weather: liveMeteo, loading: liveWeatherLoading } = useLiveWeather();
  const meteo = props.meteo || liveMeteo;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Intrants & météo</h2>
          <p className="mt-1 text-sm text-[#8a7456]">
            Utilisation terrain uniquement — chaque intrant validé décrémente le stock et met à jour le coût culture (Finance).
          </p>
        </div>
        <CultureInputsWeatherPanel stocks={props.stocks} meteo={meteo} weatherLoading={liveWeatherLoading} onNavigate={props.onNavigate} />
      </section>
      <CulturesTabActionsBridge {...props} tab="Intrants" actionsMode="input" />
    </div>
  );
}

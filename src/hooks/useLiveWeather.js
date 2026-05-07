import { useEffect, useMemo, useState } from 'react';
import { meteoData } from '../utils/mockData';
import { DEFAULT_FARM_COORDS, isSenegalCoords } from '../utils/location';
import { buildWeatherAnalysis } from '../utils/weather';

export default function useLiveWeather() {
  const canUseGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [weather, setWeather] = useState(meteoData);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('senegal-default');

  useEffect(() => {
    let mounted = true;

    const applyWeather = async (coords, nextSource) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset,precipitation_probability_max&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        const current = data.current || {};
        const daily = data.daily || {};
        const weather = buildWeatherAnalysis({
          temp: current.temperature_2m ?? meteoData.temp,
          apparentTemp: current.apparent_temperature ?? current.temperature_2m ?? meteoData.apparentTemp,
          humidite: current.relative_humidity_2m ?? meteoData.humidite,
          precipitation: current.precipitation ?? 0,
          rain: current.rain ?? 0,
          showers: current.showers ?? 0,
          precipitationProbability: daily.precipitation_probability_max?.[0] ?? 0,
          weatherCode: current.weather_code ?? 0,
          cloudCover: current.cloud_cover ?? 0,
          windSpeed: current.wind_speed_10m ?? 0,
          windDirection: current.wind_direction_10m ?? 0,
          isDay: Number(current.is_day ?? 1) === 1,
          sunrise: daily.sunrise?.[0]?.slice(11, 16),
          sunset: daily.sunset?.[0]?.slice(11, 16),
          latitude: coords.latitude,
          longitude: coords.longitude,
          locationLabel: nextSource === 'live' ? 'Position actuelle au Senegal' : 'Ferme / Dakar Senegal par defaut',
          updatedAt: new Date().toISOString(),
        });

        if (mounted) {
          setWeather(weather);
          setSource(nextSource);
        }
      } catch {
        if (mounted) setSource('demo');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    applyWeather(DEFAULT_FARM_COORDS, 'senegal-default');

    if (canUseGeolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (isSenegalCoords(coords)) {
            applyWeather(coords, 'live');
          } else if (mounted) {
            setSource('senegal-default');
            setLoading(false);
          }
        },
        () => {
          if (mounted) {
            setSource('senegal-default');
            setLoading(false);
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 }
      );
    }

    return () => {
      mounted = false;
    };
  }, [canUseGeolocation]);

  return useMemo(() => ({ weather, loading, source }), [weather, loading, source]);
}

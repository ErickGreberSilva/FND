import { useMemo } from "react";
import SunCalc from "suncalc";

/**
 * Hook React para cálculo de parâmetros solares
 * @param date Date – data e hora local
 * @param lat number – latitude em graus decimais
 * @param lon number – longitude em graus decimais
 */
export function useSunCalc(date: Date, lat: number, lon: number) {
  return useMemo(() => {
    if (!date || isNaN(lat) || isNaN(lon)) return null;

    // 1. Posição do Sol
    const sunPos = SunCalc.getPosition(date, lat, lon);
    const altitude = (sunPos.altitude * 180) / Math.PI; // graus
    const azimuth = (180 + (sunPos.azimuth * 180) / Math.PI) % 360; // 0° = norte

    // 2. Horários solares
    const times = SunCalc.getTimes(date, lat, lon);

    // 3. Declinação solar (aprox)
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const declination =
      23.44 * Math.sin(((360 / 365) * (dayOfYear - 81)) * (Math.PI / 180));

    // 4. Ângulo horário (diferença entre o meio-dia solar e a hora local)
    const solarNoon = times.solarNoon;
    const hoursSinceNoon = (date.getTime() - solarNoon.getTime()) / 3600000;
    const hourAngle = hoursSinceNoon * 15; // 15° por hora

    // 5. Nascer/Pôr do Sol
    const sunrise = times.sunrise;
    const sunset = times.sunset;
    const dayLength =
      (sunset && sunrise)
        ? (sunset.getTime() - sunrise.getTime()) / (1000 * 60 * 60)
        : 0;
    const isDaylight = altitude > 0;

    return {
      altitude,
      azimuth,
      declination,
      sunrise,
      sunset,
      solarNoon,
      dayLength,
      hourAngle,
      isDaylight,
      dayOfYear,
    };
  }, [date, lat, lon]);
}

export default useSunCalc;

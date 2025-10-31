// components/SunCalculator.ts
import SunCalc from 'suncalc';

export interface SunPosition {
  sunrise: Date;
  sunset: Date;
  altitude: number;
  azimuth: number;
}

export function getSunPosition(
  latitude: number,
  longitude: number,
  date: Date
): SunPosition {
  const times = SunCalc.getTimes(date, latitude, longitude);
  const position = SunCalc.getPosition(date, latitude, longitude);

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    altitude: (position.altitude * 180) / Math.PI,
    azimuth: (position.azimuth * 180) / Math.PI,
  };
}

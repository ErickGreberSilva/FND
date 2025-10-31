declare module 'solar-calculator' {
  interface SolarLocation {
    latitude: number;
    longitude: number;
  }

  interface SolarCalculator {
    position(date: Date): [number, number]; // [longitude, latitude]
    noon(date: Date): Date;
  }

  export function solar(location: SolarLocation): SolarCalculator;
}

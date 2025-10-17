export function utmToLatLon(x: number, y: number, zone = 22, south = true): [number, number] {
  const a = 6378137.0;
  const e = 0.081819191;
  const k0 = 0.9996;

  x -= 500000;
  if (south) y -= 10000000;

  const m = y / k0;
  const mu = m / (a * (1 - e ** 2 / 4 - 3 * e ** 4 / 64 - 5 * e ** 6 / 256));
  const e1 = (1 - Math.sqrt(1 - e ** 2)) / (1 + Math.sqrt(1 - e ** 2));
  const j1 = 3 * e1 / 2 - 27 * e1 ** 3 / 32;
  const j2 = 21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32;
  const j3 = 151 * e1 ** 3 / 96;
  const j4 = 1097 * e1 ** 4 / 512;
  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
  const c1 = (e ** 2 / (1 - e ** 2)) * Math.cos(fp) ** 2;
  const t1 = Math.tan(fp) ** 2;
  const r1 = a * (1 - e ** 2) / Math.pow(1 - e ** 2 * Math.sin(fp) ** 2, 1.5);
  const n1 = a / Math.sqrt(1 - e ** 2 * Math.sin(fp) ** 2);
  const d = x / (n1 * k0);
  const lat = fp - (n1 * Math.tan(fp) / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e ** 2 / (1 - e ** 2)) * d ** 4 / 24);
  const lon = (d - (1 + 2 * t1 + c1) * d ** 3 / 6) / Math.cos(fp);
  return [lat * 180 / Math.PI, lon * 180 / Math.PI + (zone * 6 - 183)];
}
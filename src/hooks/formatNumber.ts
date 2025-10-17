// src/hooks/formatNumber.ts

export function format(num: number): string {
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' m²';
}
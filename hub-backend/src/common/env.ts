/**
 * Parsea un entero positivo desde una variable de entorno. Si el valor no es un
 * número positivo finito, devuelve el `fallback`.
 */
export function positiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

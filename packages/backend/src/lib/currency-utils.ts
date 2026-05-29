/**
 * Danish currency formatter.
 * Converts numbers to Danish kroner format (e.g. 471540 → "471.540,00 kr.")
 */

/**
 * Formats a number into Danish currency format.
 * @param amount - Number (e.g. 471540)
 * @returns Danish formatted currency, e.g. "471.540,00 kr."
 */
export function formatDanishCurrency(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots},${decPart} kr.`;
}

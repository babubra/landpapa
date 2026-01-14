import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Склоняет слово в зависимости от числа (русский язык).
 * @param n - число
 * @param forms - [один, два-четыре, пять-двадцать]
 * @example pluralize(1, ['участок', 'участка', 'участков']) → 'участок'
 * @example pluralize(5, ['участок', 'участка', 'участков']) → 'участков'
 */
export function pluralize(n: number, forms: [string, string, string]): string {
  const n10 = Math.abs(n) % 10;
  const n100 = Math.abs(n) % 100;

  if (n100 >= 11 && n100 <= 19) return forms[2]; // 11-19 → участков
  if (n10 === 1) return forms[0];                // 1, 21, 31 → участок
  if (n10 >= 2 && n10 <= 4) return forms[1];     // 2-4, 22-24 → участка
  return forms[2];                               // 0, 5-9, 10, 25-30 → участков
}

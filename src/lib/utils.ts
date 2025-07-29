import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number with thousand separators
export const formatCurrency = (value: string | number): string => {
  if (!value) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Parse formatted number
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
};

// Handle numeric input with formatting
export const handleCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  return formatCurrency(numericValue);
};

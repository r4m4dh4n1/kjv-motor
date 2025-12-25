import { format, parse } from "date-fns";

export const getCurrentDate = () => {
  return format(new Date(), "dd/MM/yyyy");
};

export const convertDateToISO = (dateStr: string) => {
  try {
    const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
    return format(parsedDate, "yyyy-MM-dd");
  } catch (error) {
    return format(new Date(), "yyyy-MM-dd");
  }
};

export const convertDateFromISO = (isoStr: string) => {
  try {
    return format(new Date(isoStr), "dd/MM/yyyy");
  } catch (error) {
    return getCurrentDate();
  }
};

// Format number with thousand separators
export const formatCurrency = (value: string | number): string => {
  if (!value) return '';
  // Jika input string, hapus semua non-digit dulu sebelum parsing
  const numValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('id-ID');
};

// Parse formatted number - Fixed untuk format Indonesia
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Hapus semua karakter kecuali angka, khusus untuk format Indonesia (1.000.000)
  const cleanValue = value.replace(/[^0-9]/g, '');
  return parseInt(cleanValue) || 0;
};

// Handle numeric input with formatting
export const handleCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  return formatCurrency(numericValue);
};

// Generate year options dynamic (from 2005 to current year + 1)
const currentYear = new Date().getFullYear();
export const yearOptions = Array.from({ length: currentYear - 2005 + 2 }, (_, i) => 2005 + i);


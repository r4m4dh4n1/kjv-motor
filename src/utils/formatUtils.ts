// Utility untuk format angka dengan separator ribuan
export const formatNumber = (value: string | number): string => {
  if (!value) return '';
  const numValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('id-ID');
};

// Utility untuk parse angka dari format display - DIPERBAIKI
export const parseFormattedNumber = (value: string): number => {
  if (!value) return 0;
  // Hapus semua karakter kecuali angka untuk format Indonesia
  const cleanValue = value.replace(/[^0-9]/g, '');
  return parseInt(cleanValue) || 0;
};

// Utility untuk format input angka
export const handleNumericInput = (value: string, setter: (val: string) => void) => {
  const numericValue = value.replace(/[^0-9]/g, '');
  setter(numericValue);
};

// Format number with thousand separators - DIPERBAIKI
export const formatCurrency = (value: string | number): string => {
  if (!value) return '';
  const numValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Parse formatted number - SUDAH BENAR
export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Hapus semua karakter kecuali angka, untuk format Indonesia (1.000.000)
  const cleanValue = value.replace(/[^0-9]/g, '');
  return parseInt(cleanValue) || 0;
};

// Handle numeric input with formatting
export const handleCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/[^0-9]/g, '');
  if (!numericValue) return '';
  return formatCurrency(numericValue);
};

// Format date to Indonesian locale
export const formatDate = (date: Date | string): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString('id-ID');
};
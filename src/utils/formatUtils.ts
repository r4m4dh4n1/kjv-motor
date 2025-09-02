// Utility untuk format angka dengan separator ribuan
export const formatNumber = (value: string | number): string => {
  if (!value) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('id-ID');
};

// Utility untuk parse angka dari format display
export const parseFormattedNumber = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
};

// Utility untuk format input angka
export const handleNumericInput = (value: string, setter: (val: string) => void) => {
  const numericValue = value.replace(/[^0-9]/g, '');
  setter(numericValue);
};

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

// Parse formatted number - PERBAIKAN UTAMA
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
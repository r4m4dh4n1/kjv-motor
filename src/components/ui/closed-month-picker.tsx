import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ClosedMonthPickerProps {
  value?: string; // Format: "YYYY-MM"
  onChange: (value: string) => void;
  closedMonths: string[]; // Array of closed months in "YYYY-MM" format
  placeholder?: string;
  disabled?: boolean;
}

export function ClosedMonthPicker({
  value,
  onChange,
  closedMonths,
  placeholder = "Pilih bulan...",
  disabled = false
}: ClosedMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      return parseInt(value.split('-')[0]);
    }
    return new Date().getFullYear();
  });

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const formatDisplayValue = (monthYear: string) => {
    if (!monthYear) return placeholder;
    const [year, month] = monthYear.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${months[monthIndex]} ${year}`;
  };

  const isMonthClosed = (year: number, month: number) => {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    return closedMonths.includes(monthStr);
  };

  const handleMonthSelect = (year: number, month: number) => {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    onChange(monthStr);
    setIsOpen(false);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  // Get available years from closed months
  const availableYears = [...new Set(closedMonths.map(month => parseInt(month.split('-')[0])))].sort((a, b) => b - a);
  const minYear = Math.min(...availableYears);
  const maxYear = Math.max(...availableYears);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatDisplayValue(value || "")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateYear('prev')}
              disabled={currentYear <= minYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold text-sm">
              {currentYear}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateYear('next')}
              disabled={currentYear >= maxYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {months.map((monthName, index) => {
              const monthNumber = index + 1;
              const isClosed = isMonthClosed(currentYear, monthNumber);
              const isSelected = value === `${currentYear}-${monthNumber.toString().padStart(2, '0')}`;

              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 text-xs",
                    !isClosed && "opacity-50 cursor-not-allowed",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  disabled={!isClosed}
                  onClick={() => isClosed && handleMonthSelect(currentYear, monthNumber)}
                >
                  {monthName.substring(0, 3)}
                </Button>
              );
            })}
          </div>

          {/* Info Text */}
          <div className="mt-3 text-xs text-muted-foreground text-center">
            Hanya bulan yang sudah di-close yang dapat dipilih
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
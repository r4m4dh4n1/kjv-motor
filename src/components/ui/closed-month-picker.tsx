import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ClosedMonthPickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange: (value: string) => void;
  closedMonths: string[]; // Array of closed months in "YYYY-MM" format
  placeholder?: string;
  disabled?: boolean;
}

export function ClosedMonthPicker({
  value,
  onChange,
  closedMonths,
  placeholder = "Pilih tanggal...",
  disabled = false
}: ClosedMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
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

  const formatDisplayValue = (dateValue: string) => {
    if (!dateValue) return placeholder;
    const parts = dateValue.split('-');
    if (parts.length === 3) {
      // Full date format YYYY-MM-DD
      const [year, month, day] = parts;
      const monthIndex = parseInt(month) - 1;
      return `${parseInt(day)} ${months[monthIndex]} ${year}`;
    } else if (parts.length === 2) {
      // Month only format YYYY-MM
      const [year, month] = parts;
      const monthIndex = parseInt(month) - 1;
      return `${months[monthIndex]} ${year}`;
    }
    return placeholder;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const isMonthClosed = (year: number, month: number) => {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    return closedMonths.includes(monthStr);
  };

  const handleMonthSelect = (year: number, month: number) => {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    setSelectedMonth(monthStr);
    // Don't close the popover yet, let user select date
  };

  const handleDateSelect = (day: number) => {
    if (!selectedMonth) return;
    const dateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
    setSelectedMonth(null);
  };

  const handleBackToMonthSelection = () => {
    setSelectedMonth(null);
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
          {!selectedMonth ? (
            <>
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
                  const currentMonthStr = `${currentYear}-${monthNumber.toString().padStart(2, '0')}`;
                  const isSelected = value?.startsWith(currentMonthStr);

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
            </>
          ) : (
            <>
              {/* Date Selection Header */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToMonthSelection}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold text-sm">
                  {formatDisplayValue(selectedMonth)}
                </div>
                <div className="w-8"></div> {/* Spacer */}
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getDaysInMonth(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1])) }, (_, i) => {
                  const day = i + 1;
                  const currentDateStr = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
                  const isSelected = value === currentDateStr;

                  return (
                    <Button
                      key={day}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-8 w-8 text-xs p-0",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => handleDateSelect(day)}
                    >
                      {day}
                    </Button>
                  );
                })}
              </div>

              {/* Info Text */}
              <div className="mt-3 text-xs text-muted-foreground text-center">
                Pilih tanggal untuk bulan yang dipilih
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
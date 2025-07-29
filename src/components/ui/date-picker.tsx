import React from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Pilih tanggal", 
  className,
  id,
  required 
}: DatePickerProps) {
  // Convert ISO date string to Date object for Calendar component
  const parseValue = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      // If it's already in ISO format (yyyy-mm-dd)
      if (dateStr.includes('-') && dateStr.length === 10) {
        return new Date(dateStr);
      }
      // If it's in dd/mm/yyyy format
      if (dateStr.includes('/')) {
        return parse(dateStr, 'dd/MM/yyyy', new Date());
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  // Format Date object to ISO string for storage
  const formatValue = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  // Format Date object to dd/mm/yyyy for display
  const displayValue = (dateStr: string): string => {
    const date = parseValue(dateStr);
    if (!date) return "";
    return format(date, 'dd/MM/yyyy');
  };

  const selectedDate = parseValue(value || "");

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatValue(date));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? displayValue(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
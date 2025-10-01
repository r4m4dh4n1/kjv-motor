import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import RetroactiveApprovalPage from "@/components/operational/RetroactiveApprovalPage";

const RetroactiveApprovalPageWrapper = () => {
  const [selectedDivision, setSelectedDivision] = useState('all');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8" />
            Approval Retroactive Operational
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola persetujuan untuk transaksi operational yang akan dicatat di bulan yang sudah di-close
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Divisi:</span>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Divisi</SelectItem>
                <SelectItem value="sport">Sport</SelectItem>
                <SelectItem value="start">Start</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <RetroactiveApprovalPage selectedDivision={selectedDivision} />
    </div>
  );
};

export default RetroactiveApprovalPageWrapper;
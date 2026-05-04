import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import RetroactiveOperationalDialog from "./RetroactiveOperationalDialog";

interface RetroactiveOperationalIntegrationProps {
  selectedDivision: string;
  onRefresh?: () => void;
}

const RetroactiveOperationalIntegration = ({ 
  selectedDivision, 
  onRefresh 
}: RetroactiveOperationalIntegrationProps) => {
  return (
    <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          Retroactive Operational Adjustment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Untuk mencatat transaksi operational yang perlu dimasukkan ke bulan yang sudah di-close.
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Memerlukan Approval
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Audit Trail Lengkap
          </Badge>
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Dampak Historical
          </Badge>
        </div>

        <div className="flex gap-2">
          <RetroactiveOperationalDialog
            selectedDivision={selectedDivision}
            onSuccess={onRefresh}
            trigger={
              <Button variant="outline" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Buat Pengajuan Retroactive
              </Button>
            }
          />
          
          <Button 
            variant="ghost" 
            className="gap-2"
            onClick={() => {
              // Navigate to approval page - implementasi tergantung routing system
              window.location.href = '/operational/retroactive-approval';
            }}
          >
            Lihat Status Pengajuan
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-white p-3 rounded border">
          <strong>Catatan:</strong> Fitur ini khusus untuk transaksi yang perlu dicatat di bulan yang sudah di-close. 
          Untuk transaksi bulan berjalan, gunakan form operational biasa di atas.
        </div>
      </CardContent>
    </Card>
  );
};

export default RetroactiveOperationalIntegration;
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const RetroactiveApprovalPageWrapper = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Fitur Dalam Pengembangan</h2>
            <p className="text-muted-foreground max-w-md">
              Halaman Approval Retroactive Operational sedang dalam tahap pengembangan.
              Silakan gunakan fitur Retroactive di menu Operational untuk mencatat transaksi retroaktif.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetroactiveApprovalPageWrapper;

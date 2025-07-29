import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Lock, AlertTriangle } from 'lucide-react';

const CloseMonthPage = () => {
  const [targetMonth, setTargetMonth] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleCloseMonth = async () => {
    if (!targetMonth || !targetYear) {
      toast({
        title: "Error",
        description: "Silakan masukkan bulan dan tahun yang valid",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('close_month', {
        target_month: parseInt(targetMonth),
        target_year: parseInt(targetYear),
        notes: notes || null
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Sukses",
        description: `Berhasil menutup bulan ${targetMonth}/${targetYear}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan saat menutup bulan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentDate = new Date();
  const defaultMonth = currentDate.getMonth() + 1;
  const defaultYear = currentDate.getFullYear();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Close Month</h1>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Peringatan:</strong> Proses close month akan memindahkan semua data transaksi yang sudah selesai ke tabel history. 
          Hanya pembelian dengan status "ready" dan penjualan dengan status "booked" yang akan tetap di tabel aktif.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Tutup Bulan
          </CardTitle>
          <CardDescription>
            Pilih bulan dan tahun yang ingin ditutup. Pastikan semua transaksi untuk periode tersebut sudah final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Bulan</Label>
              <Input
                id="month"
                type="number"
                min="1"
                max="12"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                placeholder={`${defaultMonth}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Tahun</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2030"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                placeholder={`${defaultYear}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masukkan catatan untuk closure ini..."
              rows={3}
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={isLoading || !targetMonth || !targetYear}
              >
                {isLoading ? "Memproses..." : "Tutup Bulan"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Close Month</AlertDialogTitle>
                <AlertDialogDescription>
                  Anda akan menutup bulan <strong>{targetMonth}/{targetYear}</strong>. 
                  Proses ini akan memindahkan semua data transaksi yang sudah selesai ke tabel history.
                  <br /><br />
                  <strong>Proses ini tidak dapat dibatalkan!</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseMonth}>
                  Ya, Tutup Bulan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Hasil Close Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Bulan/Tahun:</strong> {result.month}/{result.year}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Pembelian</p>
                  <p className="text-lg font-semibold">{result.records_moved.pembelian}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Penjualan</p>
                  <p className="text-lg font-semibold">{result.records_moved.penjualan}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Pembukuan</p>
                  <p className="text-lg font-semibold">{result.records_moved.pembukuan}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Cicilan</p>
                  <p className="text-lg font-semibold">{result.records_moved.cicilan}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="text-lg font-semibold">{result.records_moved.fee_penjualan}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Operational</p>
                  <p className="text-lg font-semibold">{result.records_moved.operational}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Biro Jasa</p>
                  <p className="text-lg font-semibold">{result.records_moved.biro_jasa}</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Assets</p>
                  <p className="text-lg font-semibold">{result.records_moved.assets}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CloseMonthPage;
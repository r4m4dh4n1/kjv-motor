import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Lock, AlertTriangle, RotateCcw, Eye, CheckCircle, XCircle } from 'lucide-react';

interface CloseMonthPageProps {
  selectedDivision: string;
}

const CloseMonthPage = ({ selectedDivision }: CloseMonthPageProps) => {
  const [targetMonth, setTargetMonth] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isAlreadyClosed, setIsAlreadyClosed] = useState(false);
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
      setRestoreResult(null); // Clear restore result when closing
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

  const handleRestoreMonth = async () => {
    if (!targetMonth || !targetYear) {
      toast({
        title: "Error",
        description: "Silakan masukkan bulan dan tahun yang valid",
        variant: "destructive",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const { data, error } = await supabase.rpc('restore_month', {
        target_month: parseInt(targetMonth),
        target_year: parseInt(targetYear),
        target_division: selectedDivision
      });

      if (error) throw error;

      setRestoreResult(data);
      setResult(null); // Clear close result when restoring
      toast({
        title: "Sukses",
        description: `Berhasil mengembalikan bulan ${targetMonth}/${targetYear}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan saat mengembalikan bulan",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const currentDate = new Date();
  // Default to previous month to avoid closing current month accidentally
  const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
  const defaultMonth = previousMonth;
  const defaultYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
  
  const handlePreviewClose = async () => {
    if (!targetMonth || !targetYear) {
      toast({
        title: "Error",
        description: "Silakan masukkan bulan dan tahun yang valid",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      // Query to count records that would be affected
      const [
        { count: pembelianCount },
        { count: penjualanCount }, 
        { count: cicilanCount },
        { count: feePenjualanCount },
        { count: operationalCount },
        { count: biroJasaCount },
        { count: assetsCount }
      ] = await Promise.all([
        supabase
          .from('pembelian')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sold')
          .eq('divisi', selectedDivision)
          .gte('tanggal_pembelian', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal_pembelian', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`),
        
        supabase
          .from('penjualans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sold')
          .eq('divisi', selectedDivision)
          .gte('tanggal', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`),
          
        supabase
          .from('cicilan')
          .select('*, penjualans!inner(divisi)', { count: 'exact', head: true })
          .eq('status', 'completed')
          .eq('penjualans.divisi', selectedDivision)
          .gte('tanggal_bayar', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal_bayar', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`),
          
        supabase
          .from('fee_penjualan')
          .select('*', { count: 'exact', head: true })
          .eq('divisi', selectedDivision)
          .gte('tanggal_fee', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal_fee', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`),
          
        supabase
          .from('operational')
          .select('*', { count: 'exact', head: true })
          .eq('divisi', selectedDivision)
          .gte('tanggal', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`),
          
        supabase
          .from('biro_jasa')
          .select('*', { count: 'exact', head: true })
          .eq('divisi', selectedDivision)
          .gte('tanggal', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`),
          
        supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('divisi', selectedDivision)
          .gte('tanggal_perolehan', `${targetYear}-${targetMonth.padStart(2, '0')}-01`)
          .lt('tanggal_perolehan', `${targetYear}-${parseInt(targetMonth) === 12 ? parseInt(targetYear) + 1 : targetYear}-${parseInt(targetMonth) === 12 ? '01' : (parseInt(targetMonth) + 1).toString().padStart(2, '0')}-01`)
      ]);

      setPreviewData({
        month: targetMonth,
        year: targetYear,
        records_to_move: {
          pembelian: pembelianCount || 0,
          penjualan: penjualanCount || 0, 
          cicilan: cicilanCount || 0,
          fee_penjualan: feePenjualanCount || 0,
          operational: operationalCount || 0,
          biro_jasa: biroJasaCount || 0,
          assets: assetsCount || 0
        }
      });

      toast({
        title: "Preview Berhasil",
        description: `Preview data untuk bulan ${targetMonth}/${targetYear} telah dimuat`,
      });

    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Terjadi kesalahan saat memuat preview",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Validation for current month
  const isCurrentMonth = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    return parseInt(targetMonth) === currentMonth && parseInt(targetYear) === currentYear;
  };

  // Check if month is already closed
  useEffect(() => {
    const checkIfClosed = async () => {
      if (targetMonth && targetYear) {
        const { data } = await supabase
          .from('monthly_closures')
          .select('*')
          .eq('closure_month', parseInt(targetMonth))
          .eq('closure_year', parseInt(targetYear))
          .maybeSingle();
          
        setIsAlreadyClosed(!!data);
      }
    };
    
    checkIfClosed();
  }, [targetMonth, targetYear]);

  const monthNames = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Close Month</h1>
        </div>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
          Divisi: {selectedDivision}
        </div>
      </div>

      {/* Current Month Warning */}
      {isCurrentMonth() && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Perhatian!</strong> Anda sedang mencoba menutup bulan ini (bulan berjalan). 
            Pastikan semua transaksi bulan ini sudah benar-benar final sebelum melanjutkan.
          </AlertDescription>
        </Alert>
      )}

      {/* Already Closed Warning */}
      {isAlreadyClosed && (
        <Alert className="border-blue-200 bg-blue-50">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Info:</strong> Bulan {targetMonth}/{targetYear} sudah pernah ditutup sebelumnya. 
            Anda dapat melakukan restore jika diperlukan.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Peringatan:</strong> Proses close month akan memindahkan data transaksi yang sudah selesai ke tabel history. 
          Data yang tetap aktif: pembelian "ready", penjualan "booked", dan cicilan "pending" akan pindah ke bulan berikutnya. 
          Modal company tidak terpengaruh.
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
              <Select value={targetMonth} onValueChange={setTargetMonth}>
                <SelectTrigger>
                  <SelectValue placeholder={`Pilih bulan (default: ${monthNames[defaultMonth - 1]?.label})`} />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Preview Button */}
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={handlePreviewClose}
              disabled={isLoadingPreview || !targetMonth || !targetYear}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {isLoadingPreview ? "Memuat Preview..." : "Preview Data yang akan Ditutup"}
            </Button>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="w-full flex items-center gap-2" 
                  disabled={isRestoring || !targetMonth || !targetYear}
                >
                  <RotateCcw className="h-4 w-4" />
                  {isRestoring ? "Mengembalikan..." : "Kembalikan Bulan"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konfirmasi Restore Month</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anda akan mengembalikan bulan <strong>{targetMonth}/{targetYear}</strong> dari history. 
                    Proses ini akan memindahkan semua data dari tabel history kembali ke tabel aktif.
                    <br /><br />
                    <strong>Pastikan bulan tersebut sudah ditutup sebelumnya!</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreMonth}>
                    Ya, Kembalikan Bulan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Eye className="h-5 w-5" />
              Preview Close Month {previewData.month}/{previewData.year}
            </CardTitle>
            <CardDescription>
              Berikut adalah data yang akan dipindahkan ke history jika Anda melanjutkan proses close month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Pembelian (Sold)</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.pembelian}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Penjualan (Sold)</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.penjualan}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Cicilan (Completed)</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.cicilan}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Fee Penjualan</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.fee_penjualan}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Operational</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.operational}</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Biro Jasa</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.biro_jasa}</p>
              </div>
              <div className="bg-teal-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Assets</p>
                <p className="text-lg font-semibold">{previewData.records_to_move.assets}</p>
              </div>
            </div>
            
            {(previewData.records_to_move.pembelian === 0 && 
              previewData.records_to_move.penjualan === 0 && 
              previewData.records_to_move.cicilan === 0) && (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Perhatian:</strong> Tidak ada data yang akan dipindahkan untuk periode ini. 
                  Pastikan bulan dan tahun yang dipilih sudah benar.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

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

      {restoreResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">Hasil Restore Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Bulan/Tahun:</strong> {restoreResult.month}/{restoreResult.year}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Pembelian</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.pembelian}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Penjualan</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.penjualan}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Pembukuan</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.pembukuan}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Cicilan</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.cicilan}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Fee</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.fee_penjualan}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Operational</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.operational}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Biro Jasa</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.biro_jasa}</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Assets</p>
                  <p className="text-lg font-semibold">{restoreResult.records_restored.assets}</p>
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
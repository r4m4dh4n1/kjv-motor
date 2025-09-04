import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Banknote, Calendar, MessageSquare, Building2 } from 'lucide-react';
import { formatCurrency, parseCurrency } from '@/utils/formatUtils';

interface Company {
  id: number;
  nama_perusahaan: string;
}

interface TitipOngkirPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
  onPayoutSuccess: () => void;
}

const TitipOngkirPayoutModal: React.FC<TitipOngkirPayoutModalProps> = ({
  isOpen,
  onClose,
  penjualan,
  onPayoutSuccess
}) => {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [sumberDanaId, setSumberDanaId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && penjualan) {
      setNominal(formatCurrency((penjualan.titip_ongkir || 0).toString()));
      fetchCompanies();
      setKeterangan(`Pembayaran titip ongkir untuk ${penjualan.brands?.name || ''} ${penjualan.jenis_motor?.jenis_motor || ''} - ${penjualan.plat || ''}`);
    }
  }, [isOpen, penjualan]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, nama_perusahaan')
        .order('nama_perusahaan');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data perusahaan",
        variant: "destructive",
      });
    }
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    const formatted = formatCurrency(value);
    setNominal(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sumberDanaId) {
      toast({
        title: "Error",
        description: "Silakan pilih sumber dana",
        variant: "destructive",
      });
      return;
    }

    const nominalValue = parseCurrency(nominal);
    if (nominalValue <= 0) {
      toast({
        title: "Error",
        description: "Nominal harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Insert ongkir payment record
      const { error: paymentError } = await supabase
        .from('ongkir_payments')
        .insert({
          penjualan_id: penjualan.id,
          tanggal_bayar: tanggal,
          nominal_titip_ongkir: nominalValue,
          keterangan: keterangan || null,
          sumber_dana_id: parseInt(sumberDanaId)
        });

      if (paymentError) throw paymentError;

      // Insert to pembukuan (debit - money out)
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert({
          tanggal: tanggal,
          divisi: penjualan.divisi || 'Penjualan',
          keterangan: keterangan || `Pembayaran Titip Ongkir - ${penjualan.brands?.name || ''} ${penjualan.jenis_motor?.jenis_motor || ''} - ${penjualan.plat || ''}`,
          debit: nominalValue, // Money going out = debit
          kredit: 0,
          cabang_id: penjualan.cabang_id || 1,
          company_id: parseInt(sumberDanaId)
        });

      if (pembukuanError) throw pembukuanError;

      toast({
        title: "Berhasil",
        description: "Pembayaran titip ongkir berhasil dicatat",
      });

      onPayoutSuccess();
      onClose();
      
      // Reset form
      resetForm();

    } catch (error: any) {
      console.error('Error saving titip ongkir payout:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan pembayaran",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNominal('');
    setKeterangan('');
    setSumberDanaId('');
    setTanggal(new Date().toISOString().split('T')[0]);
  };

  if (!penjualan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Bayar Titip Ongkir - {penjualan.plat}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Motor:</span> {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor}
            </div>
            <div>
              <span className="font-medium">Plat:</span> {penjualan.plat}
            </div>
            <div>
              <span className="font-medium">Total Ongkir:</span> {formatCurrency((penjualan.total_ongkir || 0).toString())}
            </div>
            <div>
              <span className="font-medium">Titip Ongkir:</span> {formatCurrency((penjualan.titip_ongkir || 0).toString())}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tanggal Pembayaran
              </Label>
              <Input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nominal" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Nominal
              </Label>
              <Input
                id="nominal"
                type="text"
                value={nominal}
                onChange={handleNominalChange}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sumberDana" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sumber Dana
            </Label>
            <Select value={sumberDanaId} onValueChange={setSumberDanaId} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih sumber dana..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nama_perusahaan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keterangan" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Keterangan
            </Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Masukkan keterangan..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? "Menyimpan..." : "Bayar Titip Ongkir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TitipOngkirPayoutModal;
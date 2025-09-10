import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Company {
  id: number;
  nama_perusahaan: string;
  modal: number;
  divisi: string;
}

export default function ModalReductionPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, nama_perusahaan, modal, divisi')
      .eq('status', 'active')
      .order('nama_perusahaan');

    if (error) {
      toast.error('Gagal mengambil data perusahaan');
      return;
    }

    setCompanies(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany || !amount || !keterangan) {
      toast.error('Semua field harus diisi');
      return;
    }

    const reductionAmount = parseFloat(amount);
    if (reductionAmount <= 0) {
      toast.error('Jumlah pengurangan harus lebih dari 0');
      return;
    }

    const company = companies.find(c => c.id.toString() === selectedCompany);
    if (!company) {
      toast.error('Perusahaan tidak ditemukan');
      return;
    }

    if (reductionAmount > company.modal) {
      toast.error('Jumlah pengurangan tidak boleh melebihi modal saat ini');
      return;
    }

    setLoading(true);

    try {
      // Gunakan stored procedure yang sudah ada
      const { error: updateError } = await supabase.rpc('update_company_modal', {
        company_id: parseInt(selectedCompany),
        amount: -reductionAmount // Negatif untuk pengurangan
      });

      if (updateError) throw updateError;

      // Insert ke modal_history
      const { error: historyError } = await supabase
        .from('modal_history')
        .insert({
          company_id: parseInt(selectedCompany),
          jumlah: -reductionAmount,
          keterangan: `Pengurangan Modal: ${keterangan}`,
          tanggal: new Date().toISOString().split('T')[0]
        });

      if (historyError) throw historyError;

      toast.success('Modal berhasil dikurangi');
      
      // Reset form
      setSelectedCompany('');
      setAmount('');
      setKeterangan('');
      
      // Refresh data
      fetchCompanies();
      
    } catch (error) {
      console.error('Error reducing modal:', error);
      toast.error('Gagal mengurangi modal');
    } finally {
      setLoading(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id.toString() === selectedCompany);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pengurangan Modal Perusahaan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Perusahaan</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan} - {company.divisi} (Modal: Rp {company.modal.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCompanyData && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Modal saat ini: <span className="font-semibold">Rp {selectedCompanyData.modal.toLocaleString()}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Jumlah Pengurangan</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Masukkan jumlah pengurangan"
                min="1"
                max={selectedCompanyData?.modal || undefined}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Keterangan</label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Masukkan keterangan pengurangan modal"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Memproses...' : 'Kurangi Modal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
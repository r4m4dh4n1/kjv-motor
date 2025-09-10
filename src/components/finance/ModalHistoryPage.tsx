// Di file navigation/sidebar
{
  title: "Modal Perusahaan",
  icon: Building2,
  children: [
    {
      title: "Pengurangan Modal",
      href: "/finance/modal-reduction"
    },
    {
      title: "History Modal",
      href: "/finance/modal-history"
    }
  ]
}import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dateUtils';

interface ModalHistory {
  id: number;
  company_id: number;
  jumlah: number;
  keterangan: string;
  tanggal: string;
  created_at: string;
  companies: {
    nama_perusahaan: string;
    divisi: string;
  };
}

export default function ModalHistoryPage() {
  const [history, setHistory] = useState<ModalHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('modal_history')
      .select(`
        *,
        companies (
          nama_perusahaan,
          divisi
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching modal history:', error);
      return;
    }

    setHistory(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Perubahan Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{item.companies.nama_perusahaan}</h3>
                    <p className="text-sm text-gray-600">{item.companies.divisi}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.jumlah > 0 ? 'default' : 'destructive'}>
                      {item.jumlah > 0 ? '+' : ''}Rp {item.jumlah.toLocaleString()}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(item.tanggal)}</p>
                  </div>
                </div>
                <p className="text-sm">{item.keterangan}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
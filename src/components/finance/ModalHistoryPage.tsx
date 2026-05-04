import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Fungsi untuk memformat tanggal
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Perubahan Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Belum ada riwayat perubahan modal
              </div>
            ) : (
              history.map((item) => (
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
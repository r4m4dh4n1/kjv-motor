import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertTriangle, 
  DollarSign,
  Calendar,
  Building2,
  User,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RetroactiveOperational, RetroactiveStatus } from "@/types/retroactive";

interface RetroactiveApprovalPageProps {
  selectedDivision: string;
}

interface ExtendedRetroactiveOperational extends RetroactiveOperational {
  company_name: string;
  company_modal: number;
  created_by_name: string;
  approved_by_name?: string;
}

const RetroactiveApprovalPage = ({ selectedDivision }: RetroactiveApprovalPageProps) => {
  const [data, setData] = useState<ExtendedRetroactiveOperational[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ExtendedRetroactiveOperational | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<RetroactiveStatus | 'all'>('all');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDivision, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('retroactive_operational')
        .select(`
          *,
          companies!inner(nama, modal),
          profiles!retroactive_operational_created_by_fkey(full_name),
          approved_profiles:profiles!retroactive_operational_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: result, error } = await query;
      if (error) throw error;

      const formattedData = result?.map(item => ({
        ...item,
        company_name: item.companies.nama,
        company_modal: item.companies.modal,
        created_by_name: item.profiles?.full_name || 'Unknown',
        approved_by_name: item.approved_profiles?.full_name
      })) || [];

      setData(formattedData);
    } catch (error) {
      console.error('Error fetching retroactive data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data retroactive operational",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedItem) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Alasan penolakan harus diisi",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        [`${action}d_at`]: new Date().toISOString(),
        [`${action}d_by`]: (await supabase.auth.getUser()).data.user?.id
      };

      if (action === 'reject') {
        updateData.rejected_reason = rejectionReason;
      }

      const { error: updateError } = await supabase
        .from('retroactive_operational')
        .update(updateData)
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Jika approved, jalankan adjustment
      if (action === 'approve') {
        await executeAdjustment(selectedItem);
      }

      toast({
        title: "Berhasil",
        description: `Retroactive operational berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}`,
      });

      setShowActionDialog(false);
      setSelectedItem(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing retroactive operational:`, error);
      toast({
        title: "Error",
        description: `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} retroactive operational`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const executeAdjustment = async (item: ExtendedRetroactiveOperational) => {
    try {
      // Debug logging
      console.log('Debug - Executing adjustment:', {
        original_month: item.original_month,
        tanggal: `${item.original_month}-01`,
        category: item.category
      });

      // Insert ke tabel operational dengan tanggal original
      const { data: operationalData, error: operationalError } = await supabase
        .from('operational')
        .insert({
          tanggal: `${item.original_month}-01`, // Gunakan tanggal 1 dari bulan target
          kategori: item.category,
          nominal: item.nominal,
          deskripsi: `[RETROACTIVE] ${item.description}`,
          company_id: item.company_id,
          divisi: item.divisi,
          status: 'active',
          is_retroactive: true,
          retroactive_id: item.id,
          original_month: `${item.original_month}-01` // Use proper DATE format (YYYY-MM-DD)
        })
        .select()
        .single();

      if (operationalError) throw operationalError;

      // Update modal company
      // ✅ OP GLOBAL: Gunakan nominal penuh untuk modal
      const modalAmount = isOPGlobalCategory ? item.nominal : item.nominal;
      
      const { error: modalError } = await supabase
        .from('companies')
        .update({
          modal: item.company_modal - modalAmount
        })
        .eq('id', item.company_id);

      if (modalError) throw modalError;

      // Jika kategori "Kurang Profit", panggil RPC deduct_profit
      if (item.category === 'Gaji Kurang Profit') {
        const { error: profitError } = await supabase.rpc('deduct_profit', {
          p_operational_id: operationalData.id,
          p_tanggal: `${item.original_month}-01`,
          p_divisi: item.divisi,
          p_kategori: item.category,
          p_deskripsi: `[RETROACTIVE] ${item.description}`,
          p_nominal: item.nominal
        });

        if (profitError) throw profitError;
      }

      // Insert ke pembukuan
      // ✅ OP GLOBAL: Gunakan nominal penuh untuk pembukuan
      const isOPGlobalCategory = item.category === 'OP Global';
      const pembukuanAmount = isOPGlobalCategory ? item.nominal : item.nominal;
      
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert({
          tanggal: `${item.original_month}-01`,
          jenis_transaksi: 'operational_retroactive',
          deskripsi: `[RETROACTIVE] ${item.description}${isOPGlobalCategory ? ' (OP Global - Nominal Penuh)' : ''}`,
          debit: 0,
          kredit: pembukuanAmount,
          company_id: item.company_id,
          divisi: item.divisi,
          referensi_id: item.id,
          referensi_tabel: 'retroactive_operational'
        });

      if (pembukuanError) throw pembukuanError;

      // Update atau insert monthly_adjustments
      await updateMonthlyAdjustments(item);

    } catch (error) {
      console.error('Error executing adjustment:', error);
      throw error;
    }
  };

  const updateMonthlyAdjustments = async (item: ExtendedRetroactiveOperational) => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('monthly_adjustments')
        .select('*')
        .eq('month', item.original_month)
        .eq('divisi', item.divisi)
        .single();

      const profitImpact = item.category === 'Gaji Kurang Profit' ? item.nominal : 0;
      const modalImpact = item.nominal;

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('monthly_adjustments')
          .update({
            total_adjustments: existing.total_adjustments + item.nominal,
            total_impact_profit: existing.total_impact_profit + profitImpact,
            total_impact_modal: existing.total_impact_modal + modalImpact,
            adjustment_count: existing.adjustment_count + 1,
            last_adjustment_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('monthly_adjustments')
          .insert({
            month: item.original_month,
            year: item.original_year,
            divisi: item.divisi,
            total_adjustments: item.nominal,
            total_impact_profit: profitImpact,
            total_impact_modal: modalImpact,
            adjustment_count: 1,
            last_adjustment_date: new Date().toISOString().split('T')[0]
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating monthly adjustments:', error);
      throw error;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID');
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getStatusBadge = (status: RetroactiveStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
    }
  };

  const openActionDialog = (item: ExtendedRetroactiveOperational, action: 'approve' | 'reject') => {
    setSelectedItem(item);
    setActionType(action);
    setShowActionDialog(true);
    setRejectionReason('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Approval Retroactive Operational</h2>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Retroactive Operational</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Pengajuan</TableHead>
                <TableHead>Bulan Target</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pengaju</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  <TableCell>{formatMonth(item.original_month)}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.company_name}</TableCell>
                  <TableCell>{formatCurrency(item.nominal)}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>{item.created_by_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDetailDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openActionDialog(item, 'approve')}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openActionDialog(item, 'reject')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data retroactive operational
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Retroactive Operational</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bulan Target</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatMonth(selectedItem.original_month)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div>{getStatusBadge(selectedItem.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Company</Label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedItem.company_name}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nominal</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatCurrency(selectedItem.nominal)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Kategori</Label>
                <p>{selectedItem.category}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Deskripsi</Label>
                <p className="text-sm bg-muted p-3 rounded">{selectedItem.description}</p>
              </div>

              {selectedItem.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Catatan</Label>
                  <p className="text-sm bg-muted p-3 rounded">{selectedItem.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pengaju</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedItem.created_by_name}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tanggal Pengajuan</Label>
                  <span>{formatDate(selectedItem.created_at)}</span>
                </div>
              </div>

              {selectedItem.status === 'approved' && selectedItem.approved_by_name && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Disetujui Oleh</Label>
                    <span>{selectedItem.approved_by_name}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tanggal Persetujuan</Label>
                    <span>{selectedItem.approved_at ? formatDate(selectedItem.approved_at) : '-'}</span>
                  </div>
                </div>
              )}

              {selectedItem.status === 'rejected' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Alasan Penolakan</Label>
                  <p className="text-sm bg-red-50 p-3 rounded border border-red-200">
                    {selectedItem.rejected_reason}
                  </p>
                </div>
              )}

              {/* Impact Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Dampak Adjustment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Modal Saat Ini:</span>
                    <span className="font-medium">{formatCurrency(selectedItem.company_modal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pengurangan Modal:</span>
                    <span className="text-red-600 font-medium">-{formatCurrency(selectedItem.category === 'OP Global' ? selectedItem.nominal : selectedItem.nominal)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Modal Setelah Adjustment:</span>
                    <span className={`font-medium ${selectedItem.company_modal - (selectedItem.category === 'OP Global' ? selectedItem.nominal : selectedItem.nominal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedItem.company_modal - (selectedItem.category === 'OP Global' ? selectedItem.nominal : selectedItem.nominal))}
                    </span>
                  </div>
                  {selectedItem.category === 'Gaji Kurang Profit' && (
                    <div className="flex justify-between">
                      <span className="text-sm">Dampak Profit:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(selectedItem.nominal)}</span>
                    </div>
                  )}
                  
                  {selectedItem.category === 'OP Global' && (
                    <div className="flex justify-between">
                      <span className="text-sm">Dampak Pembukuan:</span>
                      <span className="text-orange-600 font-medium">-{formatCurrency(selectedItem.nominal)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Setujui' : 'Tolak'} Retroactive Operational
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {actionType === 'approve' 
                    ? 'Setelah disetujui, adjustment akan langsung diterapkan dan mempengaruhi data historical.'
                    : 'Pengajuan yang ditolak tidak dapat diubah statusnya kembali.'
                  }
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded">
                <div className="text-sm space-y-1">
                  <div><strong>Bulan Target:</strong> {formatMonth(selectedItem.original_month)}</div>
                  <div><strong>Company:</strong> {selectedItem.company_name}</div>
                  <div><strong>Nominal:</strong> {formatCurrency(selectedItem.nominal)}</div>
                  <div><strong>Kategori:</strong> {selectedItem.category}</div>
                </div>
              </div>

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejection_reason">Alasan Penolakan *</Label>
                  <Textarea
                    id="rejection_reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Masukkan alasan penolakan..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowActionDialog(false)}
                  disabled={actionLoading}
                >
                  Batal
                </Button>
                <Button
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  onClick={() => handleAction(actionType)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Memproses...' : (actionType === 'approve' ? 'Setujui' : 'Tolak')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetroactiveApprovalPage;
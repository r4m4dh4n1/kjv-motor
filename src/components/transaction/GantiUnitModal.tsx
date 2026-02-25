import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useCompaniesData } from "./hooks/usePembelianData";
import { ArrowRight, Car, TrendingUp, TrendingDown, Minus, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface GantiUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
  onConfirm: (data: GantiUnitData) => void;
  isLoading?: boolean;
}

export interface GantiUnitData {
  newPembelianId: number;
  newHargaJual: number;
  newHargaBeli: number;
  newBrandId: number;
  newJenisId: number;
  newPlat: string;
  newWarna: string;
  newTahun: number;
  newKilometer: number;
  companyId: number;
  tanggal: string;
  keterangan: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const GantiUnitModal = ({
  isOpen,
  onClose,
  penjualan,
  onConfirm,
  isLoading = false,
}: GantiUnitModalProps) => {
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedNewUnit, setSelectedNewUnit] = useState<string>("");
  const [newHargaJual, setNewHargaJual] = useState<number>(0);
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [keterangan, setKeterangan] = useState<string>("");

  const { data: companies } = useCompaniesData(penjualan?.divisi);

  // Fetch available units (pembelian with status 'tersedia')
  useEffect(() => {
    if (isOpen && penjualan) {
      fetchAvailableUnits();
    }
  }, [isOpen, penjualan]);

  const fetchAvailableUnits = async () => {
    setLoadingUnits(true);
    try {
      let query = supabase
        .from("pembelian")
        .select(
          `
          *,
          brands:brand_id(name),
          jenis_motor:jenis_motor_id(jenis_motor)
        `
        )
        .eq("status", "ready");

      if (penjualan?.divisi) {
        query = query.eq("divisi", penjualan.divisi);
      }

      const { data, error } = await query.order("tanggal_pembelian", {
        ascending: false,
      });

      if (error) {
        console.error("Error fetching available units:", error);
        return;
      }

      setAvailableUnits(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleReset = () => {
    setSelectedNewUnit("");
    setNewHargaJual(0);
    setCompanyId("");
    setTanggal(new Date().toISOString().split("T")[0]);
    setKeterangan("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const selectedUnit = availableUnits.find(
    (u) => u.id === parseInt(selectedNewUnit)
  );

  const oldHargaJual = penjualan?.harga_jual || 0;
  const selisih = newHargaJual - oldHargaJual;

  const handleSubmit = () => {
    if (!selectedUnit || !companyId || newHargaJual <= 0) return;

    onConfirm({
      newPembelianId: selectedUnit.id,
      newHargaJual: newHargaJual,
      newHargaBeli: selectedUnit.harga_beli,
      newBrandId: selectedUnit.brand_id,
      newJenisId: selectedUnit.jenis_motor_id,
      newPlat: selectedUnit.plat_nomor,
      newWarna: selectedUnit.warna,
      newTahun: selectedUnit.tahun,
      newKilometer: selectedUnit.kilometer,
      companyId: parseInt(companyId),
      tanggal,
      keterangan,
    });
  };

  if (!penjualan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Ganti Unit Penjualan
          </DialogTitle>
          <DialogDescription>
            Ganti unit motor yang sudah terjual dengan unit baru. Selisih harga akan dicatat di pembukuan.
          </DialogDescription>
        </DialogHeader>

        {/* Info Unit Lama */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-100">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">LAMA</Badge>
            Unit Saat Ini
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Motor:</span>{" "}
              <span className="font-medium">
                {penjualan.brands?.name} - {penjualan.jenis_motor?.jenis_motor}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Plat:</span>{" "}
              <Badge variant="secondary" className="font-mono text-xs">
                {penjualan.plat}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Warna:</span>{" "}
              <span className="font-medium">{penjualan.warna}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tahun:</span>{" "}
              <span className="font-medium">{penjualan.tahun}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-red-200">
              <span className="text-muted-foreground">Harga Jual Lama:</span>{" "}
              <span className="font-bold text-red-700 text-base">
                {formatCurrency(oldHargaJual)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </div>

        {/* Pilih Unit Baru */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Badge className="bg-green-600 text-xs">BARU</Badge>
            Pilih Unit Pengganti
          </h4>

          <div className="space-y-3">
            <div>
              <Label>Unit Baru *</Label>
              <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={unitPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedNewUnit
                      ? (() => {
                          const unit = availableUnits.find(
                            (u) => u.id === parseInt(selectedNewUnit)
                          );
                          return unit
                            ? `${unit.plat_nomor} — ${unit.brands?.name} ${unit.jenis_motor?.jenis_motor}`
                            : "Pilih unit pengganti";
                        })()
                      : loadingUnits
                      ? "Memuat unit..."
                      : "Pilih unit pengganti"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari plat nomor, brand, jenis..." />
                    <CommandList>
                      <CommandEmpty>
                        {loadingUnits ? "Memuat..." : "Tidak ada unit ditemukan."}
                      </CommandEmpty>
                      <CommandGroup>
                        {availableUnits.map((unit) => (
                          <CommandItem
                            key={unit.id}
                            value={`${unit.plat_nomor} ${unit.brands?.name} ${unit.jenis_motor?.jenis_motor} ${unit.warna}`}
                            onSelect={() => {
                              const val = unit.id.toString();
                              setSelectedNewUnit(val);
                              setNewHargaJual(unit.harga_beli || 0);
                              setUnitPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedNewUnit === unit.id.toString()
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{unit.plat_nomor}</span>
                              <span className="text-xs text-muted-foreground">
                                {unit.brands?.name} - {unit.jenis_motor?.jenis_motor} | {unit.warna} | {formatCurrency(unit.harga_beli)}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedUnit && (
              <div className="grid grid-cols-2 gap-2 text-sm bg-white rounded p-3">
                <div>
                  <span className="text-muted-foreground">Motor:</span>{" "}
                  <span className="font-medium">
                    {selectedUnit.brands?.name} -{" "}
                    {selectedUnit.jenis_motor?.jenis_motor}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Plat:</span>{" "}
                  <Badge variant="secondary" className="font-mono text-xs">
                    {selectedUnit.plat_nomor}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Warna:</span>{" "}
                  <span className="font-medium">{selectedUnit.warna}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tahun:</span>{" "}
                  <span className="font-medium">{selectedUnit.tahun}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Harga Beli:</span>{" "}
                  <span className="font-medium text-blue-600">
                    {formatCurrency(selectedUnit.harga_beli)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">KM:</span>{" "}
                  <span className="font-medium">
                    {selectedUnit.kilometer?.toLocaleString()} km
                  </span>
                </div>
              </div>
            )}

            <div>
              <Label>Harga Jual Baru *</Label>
              <Input
                type="number"
                value={newHargaJual || ""}
                onChange={(e) => setNewHargaJual(Number(e.target.value))}
                placeholder="Masukkan harga jual baru"
              />
            </div>
          </div>
        </div>

        {/* Selisih Harga */}
        {selectedUnit && newHargaJual > 0 && (
          <div
            className={`rounded-lg p-4 border ${
              selisih > 0
                ? "bg-blue-50 border-blue-200"
                : selisih < 0
                ? "bg-amber-50 border-amber-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2">
                {selisih > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-800">Pembeli perlu bayar tambahan</span>
                  </>
                ) : selisih < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-800">Pembeli mendapat kembalian</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-800">Tidak ada selisih</span>
                  </>
                )}
              </span>
              <span
                className={`font-bold text-lg ${
                  selisih > 0
                    ? "text-blue-700"
                    : selisih < 0
                    ? "text-amber-700"
                    : "text-gray-700"
                }`}
              >
                {formatCurrency(Math.abs(selisih))}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(oldHargaJual)} → {formatCurrency(newHargaJual)} ={" "}
              {selisih >= 0 ? "+" : "-"}{formatCurrency(Math.abs(selisih))}
            </div>
          </div>
        )}

        <Separator />

        {/* Sumber Dana & Tanggal */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Sumber Dana *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih sumber dana" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company: any) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nama_perusahaan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal *</Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Keterangan</Label>
          <Textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Catatan tambahan untuk ganti unit..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !selectedUnit ||
              !companyId ||
              newHargaJual <= 0
            }
          >
            {isLoading ? "Memproses..." : "Konfirmasi Ganti Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GantiUnitModal;

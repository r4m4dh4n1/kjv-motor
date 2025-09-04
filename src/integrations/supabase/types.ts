export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string | null
          harga_asset: number
          harga_jual: number | null
          id: number
          jenis_asset: string
          keuntungan: number | null
          status: string
          tanggal_jual: string | null
          tanggal_perolehan: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          harga_asset: number
          harga_jual?: number | null
          id?: number
          jenis_asset: string
          keuntungan?: number | null
          status?: string
          tanggal_jual?: string | null
          tanggal_perolehan: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          harga_asset?: number
          harga_jual?: number | null
          id?: number
          jenis_asset?: string
          keuntungan?: number | null
          status?: string
          tanggal_jual?: string | null
          tanggal_perolehan?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assets_history: {
        Row: {
          closed_at: string | null
          closed_month: number
          closed_year: number
          created_at: string | null
          harga_asset: number
          harga_jual: number | null
          id: number
          jenis_asset: string
          keuntungan: number | null
          status: string
          tanggal_jual: string | null
          tanggal_perolehan: string
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_month: number
          closed_year: number
          created_at?: string | null
          harga_asset: number
          harga_jual?: number | null
          id: number
          jenis_asset: string
          keuntungan?: number | null
          status: string
          tanggal_jual?: string | null
          tanggal_perolehan: string
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          created_at?: string | null
          harga_asset?: number
          harga_jual?: number | null
          id?: number
          jenis_asset?: string
          keuntungan?: number | null
          status?: string
          tanggal_jual?: string | null
          tanggal_perolehan?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      biro_jasa: {
        Row: {
          biaya_modal: number | null
          brand_name: string | null
          created_at: string | null
          dp: number | null
          estimasi_biaya: number | null
          estimasi_tanggal_selesai: string
          id: number
          jenis_motor: string | null
          jenis_pengurusan: string
          keterangan: string | null
          keuntungan: number | null
          plat_nomor: string | null
          rekening_tujuan_id: number | null
          sisa: number | null
          status: string
          tahun: number | null
          tanggal: string
          total_bayar: number | null
          updated_at: string | null
          warna: string | null
        }
        Insert: {
          biaya_modal?: number | null
          brand_name?: string | null
          created_at?: string | null
          dp?: number | null
          estimasi_biaya?: number | null
          estimasi_tanggal_selesai?: string
          id?: number
          jenis_motor?: string | null
          jenis_pengurusan: string
          keterangan?: string | null
          keuntungan?: number | null
          plat_nomor?: string | null
          rekening_tujuan_id?: number | null
          sisa?: number | null
          status?: string
          tahun?: number | null
          tanggal?: string
          total_bayar?: number | null
          updated_at?: string | null
          warna?: string | null
        }
        Update: {
          biaya_modal?: number | null
          brand_name?: string | null
          created_at?: string | null
          dp?: number | null
          estimasi_biaya?: number | null
          estimasi_tanggal_selesai?: string
          id?: number
          jenis_motor?: string | null
          jenis_pengurusan?: string
          keterangan?: string | null
          keuntungan?: number | null
          plat_nomor?: string | null
          rekening_tujuan_id?: number | null
          sisa?: number | null
          status?: string
          tahun?: number | null
          tanggal?: string
          total_bayar?: number | null
          updated_at?: string | null
          warna?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biro_jasa_rekening_tujuan_id_fkey"
            columns: ["rekening_tujuan_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      biro_jasa_cicilan: {
        Row: {
          biro_jasa_id: number
          created_at: string | null
          id: number
          jumlah_bayar: number
          keterangan: string | null
          tanggal_bayar: string
          tujuan_pembayaran_id: number | null
          updated_at: string | null
        }
        Insert: {
          biro_jasa_id: number
          created_at?: string | null
          id?: number
          jumlah_bayar?: number
          keterangan?: string | null
          tanggal_bayar?: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Update: {
          biro_jasa_id?: number
          created_at?: string | null
          id?: number
          jumlah_bayar?: number
          keterangan?: string | null
          tanggal_bayar?: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biro_jasa_cicilan_biro_jasa_id_fkey"
            columns: ["biro_jasa_id"]
            isOneToOne: false
            referencedRelation: "biro_jasa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biro_jasa_cicilan_tujuan_pembayaran_id_fkey"
            columns: ["tujuan_pembayaran_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      biro_jasa_history: {
        Row: {
          biaya_modal: number | null
          brand_id: number | null
          created_at: string | null
          dp: number | null
          estimasi_biaya: number | null
          estimasi_tanggal_selesai: string | null
          id: number | null
          jenis_motor: string | null
          jenis_motor_id: number | null
          jenis_pengurusan: string | null
          keterangan: string | null
          keuntungan: number | null
          plat_nomor: string | null
          rekening_tujuan_id: number | null
          sisa: number | null
          status: string | null
          tahun: number | null
          tanggal: string | null
          total_bayar: number | null
          updated_at: string | null
          warna: string | null
        }
        Insert: {
          biaya_modal?: number | null
          brand_id?: number | null
          created_at?: string | null
          dp?: number | null
          estimasi_biaya?: number | null
          estimasi_tanggal_selesai?: string | null
          id?: number | null
          jenis_motor?: string | null
          jenis_motor_id?: number | null
          jenis_pengurusan?: string | null
          keterangan?: string | null
          keuntungan?: number | null
          plat_nomor?: string | null
          rekening_tujuan_id?: number | null
          sisa?: number | null
          status?: string | null
          tahun?: number | null
          tanggal?: string | null
          total_bayar?: number | null
          updated_at?: string | null
          warna?: string | null
        }
        Update: {
          biaya_modal?: number | null
          brand_id?: number | null
          created_at?: string | null
          dp?: number | null
          estimasi_biaya?: number | null
          estimasi_tanggal_selesai?: string | null
          id?: number | null
          jenis_motor?: string | null
          jenis_motor_id?: number | null
          jenis_pengurusan?: string | null
          keterangan?: string | null
          keuntungan?: number | null
          plat_nomor?: string | null
          rekening_tujuan_id?: number | null
          sisa?: number | null
          status?: string | null
          tahun?: number | null
          tanggal?: string | null
          total_bayar?: number | null
          updated_at?: string | null
          warna?: string | null
        }
        Relationships: []
      }
      biro_jasa_payments: {
        Row: {
          biro_jasa_id: number
          created_at: string | null
          id: number
          jumlah_bayar: number
          keterangan: string | null
          tanggal_bayar: string
          updated_at: string | null
        }
        Insert: {
          biro_jasa_id: number
          created_at?: string | null
          id?: number
          jumlah_bayar?: number
          keterangan?: string | null
          tanggal_bayar?: string
          updated_at?: string | null
        }
        Update: {
          biro_jasa_id?: number
          created_at?: string | null
          id?: number
          jumlah_bayar?: number
          keterangan?: string | null
          tanggal_bayar?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biro_jasa_payments_biro_jasa_id_fkey"
            columns: ["biro_jasa_id"]
            isOneToOne: false
            referencedRelation: "biro_jasa"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cabang: {
        Row: {
          created_at: string | null
          id: number
          nama: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nama: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nama?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cicilan: {
        Row: {
          batch_ke: number
          created_at: string | null
          id: number
          jenis_pembayaran: string
          jumlah_bayar: number
          keterangan: string | null
          penjualan_id: number
          sisa_bayar: number
          status: string
          tanggal_bayar: string
          tujuan_pembayaran_id: number | null
          updated_at: string | null
        }
        Insert: {
          batch_ke: number
          created_at?: string | null
          id?: number
          jenis_pembayaran: string
          jumlah_bayar: number
          keterangan?: string | null
          penjualan_id: number
          sisa_bayar: number
          status?: string
          tanggal_bayar: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_ke?: number
          created_at?: string | null
          id?: number
          jenis_pembayaran?: string
          jumlah_bayar?: number
          keterangan?: string | null
          penjualan_id?: number
          sisa_bayar?: number
          status?: string
          tanggal_bayar?: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cicilan_tujuan_pembayaran_id_fkey"
            columns: ["tujuan_pembayaran_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cicilan_penjualan"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualans"
            referencedColumns: ["id"]
          },
        ]
      }
      cicilan_duplicate: {
        Row: {
          batch_ke: number
          created_at: string | null
          id: number
          jenis_pembayaran: string
          jumlah_bayar: number
          keterangan: string | null
          penjualan_id: number
          sisa_bayar: number
          status: string
          tanggal_bayar: string
          tujuan_pembayaran_id: number | null
          updated_at: string | null
        }
        Insert: {
          batch_ke: number
          created_at?: string | null
          id?: number
          jenis_pembayaran: string
          jumlah_bayar: number
          keterangan?: string | null
          penjualan_id: number
          sisa_bayar: number
          status?: string
          tanggal_bayar: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_ke?: number
          created_at?: string | null
          id?: number
          jenis_pembayaran?: string
          jumlah_bayar?: number
          keterangan?: string | null
          penjualan_id?: number
          sisa_bayar?: number
          status?: string
          tanggal_bayar?: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cicilan_duplicate_penjualan_id_fkey"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicilan_duplicate_tujuan_pembayaran_id_fkey"
            columns: ["tujuan_pembayaran_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cicilan_history: {
        Row: {
          batch_ke: number
          closed_at: string | null
          closed_month: number
          closed_year: number
          created_at: string | null
          id: number
          jenis_pembayaran: string
          jumlah_bayar: number | null
          keterangan: string | null
          nominal_dana_1: number
          nominal_dana_2: number | null
          penjualan_id: number
          sisa_bayar: number
          status: string
          sumber_dana_1_id: number | null
          sumber_dana_2_id: number | null
          tanggal_bayar: string
          tujuan_pembayaran_id: number | null
          updated_at: string | null
        }
        Insert: {
          batch_ke: number
          closed_at?: string | null
          closed_month: number
          closed_year: number
          created_at?: string | null
          id: number
          jenis_pembayaran: string
          jumlah_bayar?: number | null
          keterangan?: string | null
          nominal_dana_1?: number
          nominal_dana_2?: number | null
          penjualan_id: number
          sisa_bayar: number
          status?: string
          sumber_dana_1_id?: number | null
          sumber_dana_2_id?: number | null
          tanggal_bayar: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_ke?: number
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          created_at?: string | null
          id?: number
          jenis_pembayaran?: string
          jumlah_bayar?: number | null
          keterangan?: string | null
          nominal_dana_1?: number
          nominal_dana_2?: number | null
          penjualan_id?: number
          sisa_bayar?: number
          status?: string
          sumber_dana_1_id?: number | null
          sumber_dana_2_id?: number | null
          tanggal_bayar?: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          divisi: string
          id: number
          modal: number
          nama_perusahaan: string
          nomor_rekening: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          divisi: string
          id?: number
          modal?: number
          nama_perusahaan: string
          nomor_rekening: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          divisi?: string
          id?: number
          modal?: number
          nama_perusahaan?: string
          nomor_rekening?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          departemen: string | null
          employee_id: number
          first_name: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          departemen?: string | null
          employee_id?: number
          first_name: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          departemen?: string | null
          employee_id?: number
          first_name?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fee_penjualan: {
        Row: {
          created_at: string | null
          divisi: string
          id: number
          jumlah_fee: number
          keterangan: string | null
          penjualan_id: number
          tanggal_fee: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          divisi: string
          id?: number
          jumlah_fee?: number
          keterangan?: string | null
          penjualan_id: number
          tanggal_fee?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          divisi?: string
          id?: number
          jumlah_fee?: number
          keterangan?: string | null
          penjualan_id?: number
          tanggal_fee?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_penjualan_penjualan_id_fkey"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualans"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_penjualan_history: {
        Row: {
          closed_at: string | null
          closed_month: number
          closed_year: number
          created_at: string | null
          divisi: string
          id: number
          jumlah_fee: number
          keterangan: string | null
          penjualan_id: number
          tanggal_fee: string
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_month: number
          closed_year: number
          created_at?: string | null
          divisi: string
          id: number
          jumlah_fee?: number
          keterangan?: string | null
          penjualan_id: number
          tanggal_fee: string
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          created_at?: string | null
          divisi?: string
          id?: number
          jumlah_fee?: number
          keterangan?: string | null
          penjualan_id?: number
          tanggal_fee?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jenis_motor: {
        Row: {
          brand_id: number
          created_at: string | null
          divisi: string
          id: number
          jenis_motor: string
          qty: number
          updated_at: string | null
        }
        Insert: {
          brand_id: number
          created_at?: string | null
          divisi: string
          id?: number
          jenis_motor: string
          qty?: number
          updated_at?: string | null
        }
        Update: {
          brand_id?: number
          created_at?: string | null
          divisi?: string
          id?: number
          jenis_motor?: string
          qty?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_brand"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      modal_history: {
        Row: {
          company_id: number
          created_at: string | null
          id: number
          jumlah: number
          keterangan: string
          tanggal: string
        }
        Insert: {
          company_id: number
          created_at?: string | null
          id?: number
          jumlah: number
          keterangan: string
          tanggal?: string
        }
        Update: {
          company_id?: number
          created_at?: string | null
          id?: number
          jumlah?: number
          keterangan?: string
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "modal_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closures: {
        Row: {
          closure_date: string | null
          closure_month: number
          closure_year: number
          created_by: string | null
          id: number
          notes: string | null
          total_assets_moved: number | null
          total_biro_jasa_moved: number | null
          total_cicilan_moved: number | null
          total_fee_moved: number | null
          total_operational_moved: number | null
          total_pembelian_moved: number | null
          total_pembukuan_moved: number | null
          total_penjualan_moved: number | null
        }
        Insert: {
          closure_date?: string | null
          closure_month: number
          closure_year: number
          created_by?: string | null
          id?: never
          notes?: string | null
          total_assets_moved?: number | null
          total_biro_jasa_moved?: number | null
          total_cicilan_moved?: number | null
          total_fee_moved?: number | null
          total_operational_moved?: number | null
          total_pembelian_moved?: number | null
          total_pembukuan_moved?: number | null
          total_penjualan_moved?: number | null
        }
        Update: {
          closure_date?: string | null
          closure_month?: number
          closure_year?: number
          created_by?: string | null
          id?: never
          notes?: string | null
          total_assets_moved?: number | null
          total_biro_jasa_moved?: number | null
          total_cicilan_moved?: number | null
          total_fee_moved?: number | null
          total_operational_moved?: number | null
          total_pembelian_moved?: number | null
          total_pembukuan_moved?: number | null
          total_penjualan_moved?: number | null
        }
        Relationships: []
      }
      ongkir_cicilan: {
        Row: {
          created_at: string
          id: number
          jumlah_bayar: number
          keterangan: string | null
          penjualan_id: number
          sisa_ongkir_setelah_bayar: number
          tanggal_bayar: string
          tujuan_pembayaran_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          jumlah_bayar?: number
          keterangan?: string | null
          penjualan_id: number
          sisa_ongkir_setelah_bayar?: number
          tanggal_bayar: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          jumlah_bayar?: number
          keterangan?: string | null
          penjualan_id?: number
          sisa_ongkir_setelah_bayar?: number
          tanggal_bayar?: string
          tujuan_pembayaran_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ongkir_cicilan_penjualan_id_fkey"
            columns: ["penjualan_id"]
            isOneToOne: false
            referencedRelation: "penjualans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ongkir_cicilan_tujuan_pembayaran_id_fkey"
            columns: ["tujuan_pembayaran_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ongkir_payments: {
        Row: {
          created_at: string
          id: number
          keterangan: string | null
          nominal_titip_ongkir: number
          penjualan_id: number
          sumber_dana_id: number
          tanggal_bayar: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          keterangan?: string | null
          nominal_titip_ongkir?: number
          penjualan_id: number
          sumber_dana_id: number
          tanggal_bayar?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          keterangan?: string | null
          nominal_titip_ongkir?: number
          penjualan_id?: number
          sumber_dana_id?: number
          tanggal_bayar?: string
          updated_at?: string
        }
        Relationships: []
      }
      operational: {
        Row: {
          cabang_id: number
          company_id: number
          created_at: string
          deskripsi: string
          divisi: string
          id: string
          kategori: string
          nominal: number
          tanggal: string
          updated_at: string
        }
        Insert: {
          cabang_id?: number
          company_id: number
          created_at?: string
          deskripsi: string
          divisi: string
          id?: string
          kategori: string
          nominal: number
          tanggal: string
          updated_at?: string
        }
        Update: {
          cabang_id?: number
          company_id?: number
          created_at?: string
          deskripsi?: string
          divisi?: string
          id?: string
          kategori?: string
          nominal?: number
          tanggal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_history: {
        Row: {
          cabang_id: number
          closed_at: string | null
          closed_month: number
          closed_year: number
          company_id: number
          created_at: string
          deskripsi: string
          divisi: string
          id: string
          kategori: string
          nominal: number
          tanggal: string
          updated_at: string
        }
        Insert: {
          cabang_id?: number
          closed_at?: string | null
          closed_month: number
          closed_year: number
          company_id: number
          created_at: string
          deskripsi: string
          divisi: string
          id: string
          kategori: string
          nominal: number
          tanggal: string
          updated_at: string
        }
        Update: {
          cabang_id?: number
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          company_id?: number
          created_at?: string
          deskripsi?: string
          divisi?: string
          id?: string
          kategori?: string
          nominal?: number
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      pembelian: {
        Row: {
          brand_id: number
          cabang_id: number
          created_at: string | null
          divisi: string
          harga_beli: number
          harga_final: number | null
          id: number
          jenis_motor_id: number
          jenis_pembelian: string
          keterangan: string | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2: number | null
          plat_nomor: string
          status: string
          sumber_dana_1_id: number
          sumber_dana_2_id: number | null
          tahun: number
          tanggal_pajak: string
          tanggal_pembelian: string
          updated_at: string | null
          warna: string
        }
        Insert: {
          brand_id: number
          cabang_id: number
          created_at?: string | null
          divisi: string
          harga_beli: number
          harga_final?: number | null
          id?: number
          jenis_motor_id: number
          jenis_pembelian: string
          keterangan?: string | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2?: number | null
          plat_nomor: string
          status?: string
          sumber_dana_1_id: number
          sumber_dana_2_id?: number | null
          tahun: number
          tanggal_pajak: string
          tanggal_pembelian: string
          updated_at?: string | null
          warna: string
        }
        Update: {
          brand_id?: number
          cabang_id?: number
          created_at?: string | null
          divisi?: string
          harga_beli?: number
          harga_final?: number | null
          id?: number
          jenis_motor_id?: number
          jenis_pembelian?: string
          keterangan?: string | null
          kilometer?: number
          nominal_dana_1?: number
          nominal_dana_2?: number | null
          plat_nomor?: string
          status?: string
          sumber_dana_1_id?: number
          sumber_dana_2_id?: number | null
          tahun?: number
          tanggal_pajak?: string
          tanggal_pembelian?: string
          updated_at?: string | null
          warna?: string
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_jenis_motor_id_fkey"
            columns: ["jenis_motor_id"]
            isOneToOne: false
            referencedRelation: "jenis_motor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_sumber_dana_1_id_fkey"
            columns: ["sumber_dana_1_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_sumber_dana_2_id_fkey"
            columns: ["sumber_dana_2_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pembelian_duplicate: {
        Row: {
          brand_id: number
          cabang_id: number
          created_at: string | null
          divisi: string
          harga_beli: number
          harga_final: number | null
          id: number
          jenis_motor_id: number
          jenis_pembelian: string
          keterangan: string | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2: number | null
          plat_nomor: string
          status: string
          sumber_dana_1_id: number
          sumber_dana_2_id: number | null
          tahun: number
          tanggal_pajak: string
          tanggal_pembelian: string
          updated_at: string | null
          warna: string
        }
        Insert: {
          brand_id: number
          cabang_id: number
          created_at?: string | null
          divisi: string
          harga_beli: number
          harga_final?: number | null
          id?: number
          jenis_motor_id: number
          jenis_pembelian: string
          keterangan?: string | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2?: number | null
          plat_nomor: string
          status?: string
          sumber_dana_1_id: number
          sumber_dana_2_id?: number | null
          tahun: number
          tanggal_pajak: string
          tanggal_pembelian: string
          updated_at?: string | null
          warna: string
        }
        Update: {
          brand_id?: number
          cabang_id?: number
          created_at?: string | null
          divisi?: string
          harga_beli?: number
          harga_final?: number | null
          id?: number
          jenis_motor_id?: number
          jenis_pembelian?: string
          keterangan?: string | null
          kilometer?: number
          nominal_dana_1?: number
          nominal_dana_2?: number | null
          plat_nomor?: string
          status?: string
          sumber_dana_1_id?: number
          sumber_dana_2_id?: number | null
          tahun?: number
          tanggal_pajak?: string
          tanggal_pembelian?: string
          updated_at?: string | null
          warna?: string
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_duplicate_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_duplicate_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_duplicate_jenis_motor_id_fkey"
            columns: ["jenis_motor_id"]
            isOneToOne: false
            referencedRelation: "jenis_motor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_duplicate_sumber_dana_1_id_fkey"
            columns: ["sumber_dana_1_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembelian_duplicate_sumber_dana_2_id_fkey"
            columns: ["sumber_dana_2_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pembelian_history: {
        Row: {
          brand_id: number
          cabang_id: number
          closed_at: string | null
          closed_month: number
          closed_year: number
          created_at: string | null
          divisi: string
          harga_beli: number
          harga_final: number | null
          id: number
          jenis_motor_id: number
          jenis_pembelian: string
          keterangan: string | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2: number | null
          plat_nomor: string
          status: string
          sumber_dana_1_id: number
          sumber_dana_2_id: number | null
          tahun: number
          tanggal_pajak: string
          tanggal_pembelian: string
          updated_at: string | null
          warna: string
        }
        Insert: {
          brand_id: number
          cabang_id: number
          closed_at?: string | null
          closed_month: number
          closed_year: number
          created_at?: string | null
          divisi: string
          harga_beli: number
          harga_final?: number | null
          id?: number
          jenis_motor_id: number
          jenis_pembelian: string
          keterangan?: string | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2?: number | null
          plat_nomor: string
          status: string
          sumber_dana_1_id: number
          sumber_dana_2_id?: number | null
          tahun: number
          tanggal_pajak: string
          tanggal_pembelian: string
          updated_at?: string | null
          warna: string
        }
        Update: {
          brand_id?: number
          cabang_id?: number
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          created_at?: string | null
          divisi?: string
          harga_beli?: number
          harga_final?: number | null
          id?: number
          jenis_motor_id?: number
          jenis_pembelian?: string
          keterangan?: string | null
          kilometer?: number
          nominal_dana_1?: number
          nominal_dana_2?: number | null
          plat_nomor?: string
          status?: string
          sumber_dana_1_id?: number
          sumber_dana_2_id?: number | null
          tahun?: number
          tanggal_pajak?: string
          tanggal_pembelian?: string
          updated_at?: string | null
          warna?: string
        }
        Relationships: []
      }
      pembukuan: {
        Row: {
          cabang_id: number
          company_id: number | null
          created_at: string | null
          debit: number | null
          divisi: string
          id: number
          keterangan: string
          kredit: number | null
          pembelian_id: number | null
          saldo: number | null
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          cabang_id: number
          company_id?: number | null
          created_at?: string | null
          debit?: number | null
          divisi: string
          id?: number
          keterangan: string
          kredit?: number | null
          pembelian_id?: number | null
          saldo?: number | null
          tanggal: string
          updated_at?: string | null
        }
        Update: {
          cabang_id?: number
          company_id?: number | null
          created_at?: string | null
          debit?: number | null
          divisi?: string
          id?: number
          keterangan?: string
          kredit?: number | null
          pembelian_id?: number | null
          saldo?: number | null
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pembukuan_cabang_id_fkey"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembukuan_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pembukuan_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      pembukuan_history: {
        Row: {
          cabang_id: number
          closed_at: string | null
          closed_month: number
          closed_year: number
          company_id: number | null
          created_at: string | null
          debit: number | null
          divisi: string
          id: number
          keterangan: string
          kredit: number | null
          pembelian_id: number | null
          saldo: number | null
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          cabang_id: number
          closed_at?: string | null
          closed_month: number
          closed_year: number
          company_id?: number | null
          created_at?: string | null
          debit?: number | null
          divisi: string
          id: number
          keterangan: string
          kredit?: number | null
          pembelian_id?: number | null
          saldo?: number | null
          tanggal: string
          updated_at?: string | null
        }
        Update: {
          cabang_id?: number
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          company_id?: number | null
          created_at?: string | null
          debit?: number | null
          divisi?: string
          id?: number
          keterangan?: string
          kredit?: number | null
          pembelian_id?: number | null
          saldo?: number | null
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pencatatan_asset: {
        Row: {
          cabang_id: number
          created_at: string | null
          divisi: string
          id: number
          keterangan: string | null
          nama: string
          nominal: number
          sumber_dana_id: number
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          cabang_id?: number
          created_at?: string | null
          divisi: string
          id?: number
          keterangan?: string | null
          nama: string
          nominal?: number
          sumber_dana_id: number
          tanggal?: string
          updated_at?: string | null
        }
        Update: {
          cabang_id?: number
          created_at?: string | null
          divisi?: string
          id?: number
          keterangan?: string | null
          nama?: string
          nominal?: number
          sumber_dana_id?: number
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pencatatan_asset_history: {
        Row: {
          cabang_id: number
          closed_at: string | null
          closed_month: number
          closed_year: number
          created_at: string | null
          divisi: string
          id: number
          keterangan: string | null
          nama: string
          nominal: number
          sumber_dana_id: number
          tanggal: string
          updated_at: string | null
        }
        Insert: {
          cabang_id: number
          closed_at?: string | null
          closed_month: number
          closed_year: number
          created_at?: string | null
          divisi: string
          id: number
          keterangan?: string | null
          nama: string
          nominal: number
          sumber_dana_id: number
          tanggal: string
          updated_at?: string | null
        }
        Update: {
          cabang_id?: number
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          created_at?: string | null
          divisi?: string
          id?: number
          keterangan?: string | null
          nama?: string
          nominal?: number
          sumber_dana_id?: number
          tanggal?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      penjualans: {
        Row: {
          biaya_lain_lain: number | null
          biaya_pajak: number | null
          biaya_qc: number | null
          brand_id: number
          cabang_id: number
          catatan: string
          cicilan: boolean
          company_id: number
          company_id_2: number | null
          created_at: string | null
          divisi: string
          dp: number | null
          harga_bayar: number | null
          harga_beli: number
          harga_jual: number
          id: number
          jenis_id: number
          jenis_pembayaran: string
          keterangan_biaya_lain: string | null
          keuntungan: number | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2: number
          ongkir_dibayar: boolean | null
          pajak: string
          pembelian_id: number
          plat: string
          reason_update_harga: string | null
          sisa_bayar: number
          sisa_ongkir: number | null
          status: string
          subsidi_ongkir: number | null
          tahun: number
          tanggal: string
          tanggal_lunas: string | null
          tanggal_lunas_ongkir: string | null
          titip_ongkir: number | null
          total_ongkir: number | null
          tt: string | null
          updated_at: string | null
          warna: string
        }
        Insert: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          brand_id: number
          cabang_id: number
          catatan?: string
          cicilan?: boolean
          company_id?: number
          company_id_2?: number | null
          created_at?: string | null
          divisi: string
          dp?: number | null
          harga_bayar?: number | null
          harga_beli: number
          harga_jual: number
          id?: never
          jenis_id: number
          jenis_pembayaran?: string
          keterangan_biaya_lain?: string | null
          keuntungan?: number | null
          kilometer: number
          nominal_dana_1?: number
          nominal_dana_2?: number
          ongkir_dibayar?: boolean | null
          pajak: string
          pembelian_id?: number
          plat: string
          reason_update_harga?: string | null
          sisa_bayar: number
          sisa_ongkir?: number | null
          status: string
          subsidi_ongkir?: number | null
          tahun: number
          tanggal: string
          tanggal_lunas?: string | null
          tanggal_lunas_ongkir?: string | null
          titip_ongkir?: number | null
          total_ongkir?: number | null
          tt?: string | null
          updated_at?: string | null
          warna: string
        }
        Update: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          brand_id?: number
          cabang_id?: number
          catatan?: string
          cicilan?: boolean
          company_id?: number
          company_id_2?: number | null
          created_at?: string | null
          divisi?: string
          dp?: number | null
          harga_bayar?: number | null
          harga_beli?: number
          harga_jual?: number
          id?: never
          jenis_id?: number
          jenis_pembayaran?: string
          keterangan_biaya_lain?: string | null
          keuntungan?: number | null
          kilometer?: number
          nominal_dana_1?: number
          nominal_dana_2?: number
          ongkir_dibayar?: boolean | null
          pajak?: string
          pembelian_id?: number
          plat?: string
          reason_update_harga?: string | null
          sisa_bayar?: number
          sisa_ongkir?: number | null
          status?: string
          subsidi_ongkir?: number | null
          tahun?: number
          tanggal?: string
          tanggal_lunas?: string | null
          tanggal_lunas_ongkir?: string | null
          titip_ongkir?: number | null
          total_ongkir?: number | null
          tt?: string | null
          updated_at?: string | null
          warna?: string
        }
        Relationships: [
          {
            foreignKeyName: "FK_penjualans_brands"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FK_penjualans_cabang"
            columns: ["cabang_id"]
            isOneToOne: false
            referencedRelation: "cabang"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FK_penjualans_company_1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FK_penjualans_company_2"
            columns: ["company_id_2"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FK_penjualans_jenis"
            columns: ["jenis_id"]
            isOneToOne: false
            referencedRelation: "jenis_motor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "FK_penjualans_pembelian"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualans_backup: {
        Row: {
          biaya_lain_lain: number | null
          biaya_pajak: number | null
          biaya_qc: number | null
          brand_id: number | null
          cabang_id: number | null
          catatan: string | null
          cicilan: boolean | null
          company_id: number | null
          company_id_2: number | null
          created_at: string | null
          divisi: string | null
          dp: number | null
          harga_bayar: number | null
          harga_beli: number | null
          harga_jual: number | null
          id: number | null
          jenis_id: number | null
          jenis_pembayaran: string | null
          keterangan_biaya_lain: string | null
          keuntungan: number | null
          kilometer: number | null
          nominal_dana_1: number | null
          nominal_dana_2: number | null
          ongkir_dibayar: boolean | null
          pajak: string | null
          pembelian_id: number | null
          plat: string | null
          reason_update_harga: string | null
          sisa_bayar: number | null
          sisa_ongkir: number | null
          status: string | null
          subsidi_ongkir: number | null
          tahun: number | null
          tanggal: string | null
          tanggal_lunas: string | null
          tanggal_lunas_ongkir: string | null
          titip_ongkir: number | null
          total_ongkir: number | null
          tt: string | null
          updated_at: string | null
          warna: string | null
        }
        Insert: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          brand_id?: number | null
          cabang_id?: number | null
          catatan?: string | null
          cicilan?: boolean | null
          company_id?: number | null
          company_id_2?: number | null
          created_at?: string | null
          divisi?: string | null
          dp?: number | null
          harga_bayar?: number | null
          harga_beli?: number | null
          harga_jual?: number | null
          id?: number | null
          jenis_id?: number | null
          jenis_pembayaran?: string | null
          keterangan_biaya_lain?: string | null
          keuntungan?: number | null
          kilometer?: number | null
          nominal_dana_1?: number | null
          nominal_dana_2?: number | null
          ongkir_dibayar?: boolean | null
          pajak?: string | null
          pembelian_id?: number | null
          plat?: string | null
          reason_update_harga?: string | null
          sisa_bayar?: number | null
          sisa_ongkir?: number | null
          status?: string | null
          subsidi_ongkir?: number | null
          tahun?: number | null
          tanggal?: string | null
          tanggal_lunas?: string | null
          tanggal_lunas_ongkir?: string | null
          titip_ongkir?: number | null
          total_ongkir?: number | null
          tt?: string | null
          updated_at?: string | null
          warna?: string | null
        }
        Update: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          brand_id?: number | null
          cabang_id?: number | null
          catatan?: string | null
          cicilan?: boolean | null
          company_id?: number | null
          company_id_2?: number | null
          created_at?: string | null
          divisi?: string | null
          dp?: number | null
          harga_bayar?: number | null
          harga_beli?: number | null
          harga_jual?: number | null
          id?: number | null
          jenis_id?: number | null
          jenis_pembayaran?: string | null
          keterangan_biaya_lain?: string | null
          keuntungan?: number | null
          kilometer?: number | null
          nominal_dana_1?: number | null
          nominal_dana_2?: number | null
          ongkir_dibayar?: boolean | null
          pajak?: string | null
          pembelian_id?: number | null
          plat?: string | null
          reason_update_harga?: string | null
          sisa_bayar?: number | null
          sisa_ongkir?: number | null
          status?: string | null
          subsidi_ongkir?: number | null
          tahun?: number | null
          tanggal?: string | null
          tanggal_lunas?: string | null
          tanggal_lunas_ongkir?: string | null
          titip_ongkir?: number | null
          total_ongkir?: number | null
          tt?: string | null
          updated_at?: string | null
          warna?: string | null
        }
        Relationships: []
      }
      penjualans_history: {
        Row: {
          biaya_lain_lain: number | null
          biaya_pajak: number | null
          biaya_qc: number | null
          brand_id: number
          cabang_id: number
          catatan: string
          cicilan: boolean
          closed_at: string | null
          closed_month: number
          closed_year: number
          company_id: number
          company_id_2: number | null
          created_at: string | null
          divisi: string
          dp: number | null
          harga_bayar: number | null
          harga_beli: number
          harga_jual: number
          id: number
          jenis_id: number
          jenis_pembayaran: string
          keterangan_biaya_lain: string | null
          keuntungan: number | null
          kilometer: number
          nominal_dana_1: number
          nominal_dana_2: number
          ongkir_dibayar: boolean | null
          pajak: string
          pembelian_id: number
          plat: string
          reason_update_harga: string | null
          sisa_bayar: number
          sisa_ongkir: number | null
          status: string
          subsidi_ongkir: number | null
          tahun: number
          tanggal: string
          tanggal_lunas: string | null
          titip_ongkir: number | null
          total_ongkir: number | null
          tt: string | null
          updated_at: string | null
          warna: string
        }
        Insert: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          brand_id: number
          cabang_id: number
          catatan?: string
          cicilan?: boolean
          closed_at?: string | null
          closed_month: number
          closed_year: number
          company_id?: number
          company_id_2?: number | null
          created_at?: string | null
          divisi: string
          dp?: number | null
          harga_bayar?: number | null
          harga_beli: number
          harga_jual: number
          id: number
          jenis_id: number
          jenis_pembayaran?: string
          keterangan_biaya_lain?: string | null
          keuntungan?: number | null
          kilometer: number
          nominal_dana_1?: number
          nominal_dana_2?: number
          ongkir_dibayar?: boolean | null
          pajak: string
          pembelian_id?: number
          plat: string
          reason_update_harga?: string | null
          sisa_bayar: number
          sisa_ongkir?: number | null
          status: string
          subsidi_ongkir?: number | null
          tahun: number
          tanggal: string
          tanggal_lunas?: string | null
          titip_ongkir?: number | null
          total_ongkir?: number | null
          tt?: string | null
          updated_at?: string | null
          warna: string
        }
        Update: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          brand_id?: number
          cabang_id?: number
          catatan?: string
          cicilan?: boolean
          closed_at?: string | null
          closed_month?: number
          closed_year?: number
          company_id?: number
          company_id_2?: number | null
          created_at?: string | null
          divisi?: string
          dp?: number | null
          harga_bayar?: number | null
          harga_beli?: number
          harga_jual?: number
          id?: number
          jenis_id?: number
          jenis_pembayaran?: string
          keterangan_biaya_lain?: string | null
          keuntungan?: number | null
          kilometer?: number
          nominal_dana_1?: number
          nominal_dana_2?: number
          ongkir_dibayar?: boolean | null
          pajak?: string
          pembelian_id?: number
          plat?: string
          reason_update_harga?: string | null
          sisa_bayar?: number
          sisa_ongkir?: number | null
          status?: string
          subsidi_ongkir?: number | null
          tahun?: number
          tanggal?: string
          tanggal_lunas?: string | null
          titip_ongkir?: number | null
          total_ongkir?: number | null
          tt?: string | null
          updated_at?: string | null
          warna?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          permission_id: number
          permission_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          permission_id?: number
          permission_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          permission_id?: number
          permission_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      price_histories: {
        Row: {
          biaya_lain_lain: number | null
          biaya_pajak: number | null
          biaya_qc: number | null
          company_id: number | null
          created_at: string
          harga_jual_baru: number
          harga_jual_lama: number
          id: number
          keterangan_biaya_lain: string | null
          pembelian_id: number
          reason: string | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          company_id?: number | null
          created_at?: string
          harga_jual_baru: number
          harga_jual_lama?: number
          id?: number
          keterangan_biaya_lain?: string | null
          pembelian_id: number
          reason?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Update: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          company_id?: number | null
          created_at?: string
          harga_jual_baru?: number
          harga_jual_lama?: number
          id?: number
          keterangan_biaya_lain?: string | null
          pembelian_id?: number
          reason?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_histories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_histories_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      price_histories_pembelian: {
        Row: {
          biaya_lain_lain: number | null
          biaya_pajak: number | null
          biaya_qc: number | null
          company_id: number | null
          created_at: string
          harga_beli_baru: number
          harga_beli_lama: number
          id: number
          keterangan_biaya_lain: string | null
          pembelian_id: number
          reason: string | null
          tanggal_update: string | null
          updated_at: string
          user_id: number | null
        }
        Insert: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          company_id?: number | null
          created_at?: string
          harga_beli_baru: number
          harga_beli_lama?: number
          id?: number
          keterangan_biaya_lain?: string | null
          pembelian_id: number
          reason?: string | null
          tanggal_update?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Update: {
          biaya_lain_lain?: number | null
          biaya_pajak?: number | null
          biaya_qc?: number | null
          company_id?: number | null
          created_at?: string
          harga_beli_baru?: number
          harga_beli_lama?: number
          id?: number
          keterangan_biaya_lain?: string | null
          pembelian_id?: number
          reason?: string | null
          tanggal_update?: string | null
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_histories_pembelian_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_histories_pembelian_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          employee_id: number | null
          full_name: string | null
          id: string
          is_approved: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: number | null
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: number | null
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      profit_distribution: {
        Row: {
          bulan: number
          company_id: number | null
          created_at: string | null
          divisi: string
          id: number
          jumlah_diambil: number
          jumlah_ke_perusahaan: number
          keterangan: string | null
          status: string
          tahun: number
          tanggal: string
          tipe_keuntungan: string
          total_keuntungan: number
          updated_at: string | null
        }
        Insert: {
          bulan: number
          company_id?: number | null
          created_at?: string | null
          divisi: string
          id?: number
          jumlah_diambil?: number
          jumlah_ke_perusahaan?: number
          keterangan?: string | null
          status?: string
          tahun: number
          tanggal?: string
          tipe_keuntungan: string
          total_keuntungan?: number
          updated_at?: string | null
        }
        Update: {
          bulan?: number
          company_id?: number | null
          created_at?: string | null
          divisi?: string
          id?: number
          jumlah_diambil?: number
          jumlah_ke_perusahaan?: number
          keterangan?: string | null
          status?: string
          tahun?: number
          tanggal?: string
          tipe_keuntungan?: string
          total_keuntungan?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profit_distribution_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_history: {
        Row: {
          created_at: string | null
          id: number
          jenis_qc: string
          keterangan: string | null
          pembelian_id: number | null
          tanggal_qc: string
          total_pengeluaran: number
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          jenis_qc: string
          keterangan?: string | null
          pembelian_id?: number | null
          tanggal_qc: string
          total_pengeluaran: number
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          jenis_qc?: string
          keterangan?: string | null
          pembelian_id?: number | null
          tanggal_qc?: string
          total_pengeluaran?: number
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_history_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: number
          role_id: number
        }
        Insert: {
          created_at?: string | null
          permission_id: number
          role_id: number
        }
        Update: {
          created_at?: string | null
          permission_id?: number
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["permission_id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          role_id: number
          role_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          role_id?: number
          role_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          role_id?: number
          role_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_role_id"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "fk_user_roles_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
    }
    Views: {
      assets_combined: {
        Row: {
          closed_month: number | null
          closed_year: number | null
          created_at: string | null
          data_source: string | null
          harga_asset: number | null
          harga_jual: number | null
          id: number | null
          jenis_asset: string | null
          keuntungan: number | null
          status: string | null
          tanggal_jual: string | null
          tanggal_perolehan: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      pembelian_combined: {
        Row: {
          brand_id: number | null
          cabang_id: number | null
          closed_month: number | null
          closed_year: number | null
          created_at: string | null
          data_source: string | null
          divisi: string | null
          harga_beli: number | null
          harga_final: number | null
          id: number | null
          jenis_motor_id: number | null
          jenis_pembelian: string | null
          keterangan: string | null
          kilometer: number | null
          nominal_dana_1: number | null
          nominal_dana_2: number | null
          plat_nomor: string | null
          status: string | null
          sumber_dana_1_id: number | null
          sumber_dana_2_id: number | null
          tahun: number | null
          tanggal_pajak: string | null
          tanggal_pembelian: string | null
          updated_at: string | null
          warna: string | null
        }
        Relationships: []
      }
      pembukuan_combined: {
        Row: {
          cabang_id: number | null
          closed_month: number | null
          closed_year: number | null
          company_id: number | null
          created_at: string | null
          data_source: string | null
          debit: number | null
          divisi: string | null
          id: number | null
          keterangan: string | null
          kredit: number | null
          pembelian_id: number | null
          saldo: number | null
          tanggal: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      penjualans_combined: {
        Row: {
          biaya_lain_lain: number | null
          biaya_pajak: number | null
          biaya_qc: number | null
          brand_id: number | null
          cabang_id: number | null
          catatan: string | null
          cicilan: boolean | null
          closed_month: number | null
          closed_year: number | null
          company_id: number | null
          company_id_2: number | null
          created_at: string | null
          data_source: string | null
          divisi: string | null
          dp: number | null
          harga_bayar: number | null
          harga_beli: number | null
          harga_jual: number | null
          id: number | null
          jenis_id: number | null
          jenis_pembayaran: string | null
          keterangan_biaya_lain: string | null
          keuntungan: number | null
          kilometer: number | null
          nominal_dana_1: number | null
          nominal_dana_2: number | null
          ongkir_dibayar: boolean | null
          pajak: string | null
          pembelian_id: number | null
          plat: string | null
          reason_update_harga: string | null
          sisa_bayar: number | null
          sisa_ongkir: number | null
          status: string | null
          tahun: number | null
          tanggal: string | null
          titip_ongkir: number | null
          total_ongkir: number | null
          tt: string | null
          updated_at: string | null
          warna: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: { role_name_param: string; user_id_param: number }
        Returns: boolean
      }
      close_month: {
        Args: { notes?: string; target_month: number; target_year: number }
        Returns: Json
      }
      decrement_qty: {
        Args: { jenis_motor_id: number }
        Returns: undefined
      }
      get_monthly_data: {
        Args: { target_month: number; target_year: number }
        Returns: Json
      }
      get_user_permissions: {
        Args: { user_id_param: number }
        Returns: {
          description: string
          permission_name: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      increment_qty: {
        Args: { jenis_motor_id: number }
        Returns: undefined
      }
      is_user_approved: {
        Args: { user_id: string }
        Returns: boolean
      }
      restore_month: {
        Args: { target_month: number; target_year: number }
        Returns: Json
      }
      test_restore_assets_only: {
        Args: { target_month: number; target_year: number }
        Returns: Json
      }
      update_company_modal: {
        Args: { amount: number; company_id: number }
        Returns: undefined
      }
      user_has_permission: {
        Args: { permission_name_param: string; user_id_param: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

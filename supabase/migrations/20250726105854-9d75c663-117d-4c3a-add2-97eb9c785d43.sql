-- Create history tables for monthly closing
CREATE TABLE public.pembelian_history (
  id integer NOT NULL,
  tanggal_pembelian date NOT NULL,
  divisi character varying NOT NULL,
  cabang_id integer NOT NULL,
  jenis_pembelian character varying NOT NULL,
  brand_id integer NOT NULL,
  jenis_motor_id integer NOT NULL,
  tahun integer NOT NULL,
  warna character varying NOT NULL,
  kilometer numeric NOT NULL,
  plat_nomor character varying NOT NULL,
  tanggal_pajak date NOT NULL,
  harga_beli numeric NOT NULL,
  harga_final numeric DEFAULT 0,
  sumber_dana_1_id integer NOT NULL,
  nominal_dana_1 numeric NOT NULL,
  sumber_dana_2_id integer,
  nominal_dana_2 numeric DEFAULT 0,
  keterangan text,
  status character varying NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.penjualans_history (
  id bigint NOT NULL,
  tanggal date NOT NULL,
  cabang_id bigint NOT NULL,
  brand_id bigint NOT NULL,
  jenis_id bigint NOT NULL,
  tahun integer NOT NULL,
  kilometer integer NOT NULL,
  pajak date NOT NULL,
  harga_beli numeric NOT NULL,
  harga_jual numeric NOT NULL,
  harga_bayar numeric,
  keuntungan numeric,
  sisa_bayar numeric NOT NULL,
  titip_ongkir numeric,
  ongkir_dibayar boolean DEFAULT false,
  total_ongkir numeric,
  dp numeric,
  cicilan boolean NOT NULL DEFAULT false,
  company_id bigint NOT NULL DEFAULT 0,
  nominal_dana_1 numeric NOT NULL DEFAULT 0,
  company_id_2 bigint DEFAULT 0,
  nominal_dana_2 numeric NOT NULL DEFAULT 0,
  pembelian_id bigint NOT NULL DEFAULT 0,
  biaya_qc numeric DEFAULT 0.00,
  biaya_pajak numeric DEFAULT 0.00,
  biaya_lain_lain numeric DEFAULT 0.00,
  catatan text NOT NULL DEFAULT '0',
  keterangan_biaya_lain text,
  reason_update_harga text,
  divisi text NOT NULL,
  tt text,
  warna text NOT NULL,
  plat text NOT NULL,
  status text NOT NULL,
  jenis_pembayaran text NOT NULL DEFAULT 'cash_penuh',
  sisa_ongkir numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.pembukuan_history (
  id integer NOT NULL,
  tanggal date NOT NULL,
  divisi character varying NOT NULL,
  keterangan text NOT NULL,
  debit numeric DEFAULT 0,
  kredit numeric DEFAULT 0,
  saldo numeric DEFAULT 0,
  cabang_id integer NOT NULL,
  company_id integer,
  pembelian_id integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cicilan_history (
  id bigint NOT NULL,
  penjualan_id bigint NOT NULL,
  batch_ke integer NOT NULL,
  tanggal_bayar date NOT NULL,
  jenis_pembayaran text NOT NULL,
  jumlah_bayar numeric NOT NULL,
  sisa_bayar numeric NOT NULL,
  keterangan text,
  status text NOT NULL DEFAULT 'pending',
  tujuan_pembayaran_id integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.fee_penjualan_history (
  id integer NOT NULL,
  penjualan_id bigint NOT NULL,
  tanggal_fee date NOT NULL,
  jumlah_fee numeric NOT NULL DEFAULT 0,
  divisi character varying NOT NULL,
  keterangan text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.operational_history (
  id uuid NOT NULL,
  tanggal date NOT NULL,
  divisi text NOT NULL,
  kategori text NOT NULL,
  deskripsi text NOT NULL,
  nominal numeric NOT NULL,
  cabang_id integer NOT NULL DEFAULT 1,
  company_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.biro_jasa_history (
  id integer NOT NULL,
  tanggal date NOT NULL,
  jenis_pengurusan character varying NOT NULL,
  brand_id integer,
  jenis_motor_id integer,
  jenis_motor character varying,
  tahun integer,
  warna character varying,
  plat_nomor character varying,
  estimasi_biaya numeric DEFAULT 0,
  estimasi_tanggal_selesai date NOT NULL,
  dp numeric DEFAULT 0,
  sisa numeric DEFAULT 0,
  biaya_modal numeric DEFAULT 0,
  keuntungan numeric DEFAULT 0,
  total_bayar numeric DEFAULT 0,
  status character varying NOT NULL,
  rekening_tujuan_id integer,
  keterangan text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.assets_history (
  id integer NOT NULL,
  jenis_asset character varying NOT NULL,
  tanggal_perolehan date NOT NULL,
  harga_asset bigint NOT NULL,
  tanggal_jual date,
  harga_jual bigint,
  keuntungan bigint,
  status character varying NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  closed_month integer NOT NULL,
  closed_year integer NOT NULL,
  closed_at timestamp with time zone DEFAULT now()
);

-- Create table for tracking monthly closures
CREATE TABLE public.monthly_closures (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  closure_month integer NOT NULL,
  closure_year integer NOT NULL,
  closure_date timestamp with time zone DEFAULT now(),
  total_pembelian_moved integer DEFAULT 0,
  total_penjualan_moved integer DEFAULT 0,
  total_pembukuan_moved integer DEFAULT 0,
  total_cicilan_moved integer DEFAULT 0,
  total_fee_moved integer DEFAULT 0,
  total_operational_moved integer DEFAULT 0,
  total_biro_jasa_moved integer DEFAULT 0,
  total_assets_moved integer DEFAULT 0,
  notes text,
  created_by text,
  UNIQUE(closure_month, closure_year)
);

-- Enable RLS for all history tables
ALTER TABLE public.pembelian_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualans_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembukuan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cicilan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_penjualan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biro_jasa_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closures ENABLE ROW LEVEL SECURITY;

-- Create policies for history tables (read-only access)
CREATE POLICY "Allow read access to pembelian_history" ON public.pembelian_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to penjualans_history" ON public.penjualans_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to pembukuan_history" ON public.pembukuan_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to cicilan_history" ON public.cicilan_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to fee_penjualan_history" ON public.fee_penjualan_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to operational_history" ON public.operational_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to biro_jasa_history" ON public.biro_jasa_history FOR SELECT USING (true);
CREATE POLICY "Allow read access to assets_history" ON public.assets_history FOR SELECT USING (true);

-- Policies for monthly_closures
CREATE POLICY "Allow all access to monthly_closures" ON public.monthly_closures FOR ALL USING (true);

-- Create function for monthly closure
CREATE OR REPLACE FUNCTION public.close_month(target_month integer, target_year integer, notes text DEFAULT null)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pembelian_count integer := 0;
  penjualan_count integer := 0;
  pembukuan_count integer := 0;
  cicilan_count integer := 0;
  fee_count integer := 0;
  operational_count integer := 0;
  biro_jasa_count integer := 0;
  assets_count integer := 0;
  result json;
BEGIN
  -- Check if closure already exists
  IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year) THEN
    RAISE EXCEPTION 'Month % year % has already been closed', target_month, target_year;
  END IF;

  -- Move completed pembelian (sold, not ready) to history
  INSERT INTO pembelian_history (
    id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
    tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
    sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
    status, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
    tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
    sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
    status, created_at, updated_at, target_month, target_year
  FROM pembelian 
  WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status != 'ready';
  
  GET DIAGNOSTICS pembelian_count = ROW_COUNT;

  -- Move completed penjualans (sold, not booked) to history
  INSERT INTO penjualans_history (
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at, target_month, target_year
  FROM penjualans 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status != 'booked';
  
  GET DIAGNOSTICS penjualan_count = ROW_COUNT;

  -- Move pembukuan to history
  INSERT INTO pembukuan_history (
    id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, pembelian_id, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, pembelian_id, created_at, updated_at, target_month, target_year
  FROM pembukuan 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
  
  GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

  -- Move completed cicilan to history
  INSERT INTO cicilan_history (
    id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
    sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
    closed_month, closed_year
  )
  SELECT 
    id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
    sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
    target_month, target_year
  FROM cicilan 
  WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;
  
  GET DIAGNOSTICS cicilan_count = ROW_COUNT;

  -- Move fee_penjualan to history
  INSERT INTO fee_penjualan_history (
    id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
    created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
    created_at, updated_at, target_month, target_year
  FROM fee_penjualan 
  WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;
  
  GET DIAGNOSTICS fee_count = ROW_COUNT;

  -- Move operational to history
  INSERT INTO operational_history (
    id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
    created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
    created_at, updated_at, target_month, target_year
  FROM operational 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
  
  GET DIAGNOSTICS operational_count = ROW_COUNT;

  -- Move completed biro_jasa to history
  INSERT INTO biro_jasa_history (
    id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
    tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
    dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
    keterangan, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
    tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
    dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
    keterangan, created_at, updated_at, target_month, target_year
  FROM biro_jasa 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'Selesai';
  
  GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

  -- Move sold assets to history
  INSERT INTO assets_history (
    id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at, target_month, target_year
  FROM assets 
  WHERE ((EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year)
    OR (tanggal_jual IS NOT NULL 
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year))
    AND status = 'terjual';
  
  GET DIAGNOSTICS assets_count = ROW_COUNT;

  -- Delete moved records from original tables
  DELETE FROM pembelian 
  WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status != 'ready';

  DELETE FROM penjualans 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status != 'booked';

  DELETE FROM pembukuan 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

  DELETE FROM cicilan 
  WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;

  DELETE FROM fee_penjualan 
  WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;

  DELETE FROM operational 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

  DELETE FROM biro_jasa 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'Selesai';

  DELETE FROM assets 
  WHERE ((EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year)
    OR (tanggal_jual IS NOT NULL 
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year))
    AND status = 'terjual';

  -- Record the closure
  INSERT INTO monthly_closures (
    closure_month, closure_year, total_pembelian_moved, total_penjualan_moved,
    total_pembukuan_moved, total_cicilan_moved, total_fee_moved,
    total_operational_moved, total_biro_jasa_moved, total_assets_moved, notes
  ) VALUES (
    target_month, target_year, pembelian_count, penjualan_count,
    pembukuan_count, cicilan_count, fee_count, operational_count,
    biro_jasa_count, assets_count, notes
  );

  -- Build result
  result := json_build_object(
    'success', true,
    'month', target_month,
    'year', target_year,
    'records_moved', json_build_object(
      'pembelian', pembelian_count,
      'penjualan', penjualan_count,
      'pembukuan', pembukuan_count,
      'cicilan', cicilan_count,
      'fee_penjualan', fee_count,
      'operational', operational_count,
      'biro_jasa', biro_jasa_count,
      'assets', assets_count
    )
  );

  RETURN result;
END;
$$;
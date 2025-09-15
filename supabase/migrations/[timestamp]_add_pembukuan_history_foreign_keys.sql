-- Tambahkan foreign key constraint untuk pembukuan_history
ALTER TABLE public.pembukuan_history 
ADD CONSTRAINT pembukuan_history_cabang_id_fkey 
FOREIGN KEY (cabang_id) REFERENCES public.cabang(id);

-- Opsional: Tambahkan constraint lainnya jika diperlukan
ALTER TABLE public.pembukuan_history 
ADD CONSTRAINT pembukuan_history_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.pembukuan_history 
ADD CONSTRAINT pembukuan_history_pembelian_id_fkey 
FOREIGN KEY (pembelian_id) REFERENCES public.pembelian(id);
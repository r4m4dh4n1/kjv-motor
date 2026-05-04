-- Create table for tracking profit adjustments from operational expenses 
CREATE TABLE public.profit_adjustments ( 
  id SERIAL PRIMARY KEY, 
  operational_id UUID REFERENCES public.operational(id) ON DELETE CASCADE, 
  tanggal DATE NOT NULL, 
  divisi VARCHAR NOT NULL, 
  kategori VARCHAR NOT NULL, 
  deskripsi TEXT NOT NULL, 
  nominal NUMERIC NOT NULL, 
  adjustment_type VARCHAR NOT NULL CHECK (adjustment_type IN ('deduction', 'restoration')), 
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')), 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() 
); 

-- Enable RLS 
ALTER TABLE public.profit_adjustments ENABLE ROW LEVEL SECURITY; 

-- Create policies 
CREATE POLICY "Enable all access for profit_adjustments" 
ON public.profit_adjustments 
FOR ALL 
USING (true); 

-- Add trigger for updated_at 
CREATE TRIGGER update_profit_adjustments_updated_at 
BEFORE UPDATE ON public.profit_adjustments 
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column(); 

-- Create function to deduct profit 
CREATE OR REPLACE FUNCTION public.deduct_profit( 
  p_operational_id UUID, 
  p_tanggal DATE, 
  p_divisi VARCHAR, 
  p_kategori VARCHAR, 
  p_deskripsi TEXT, 
  p_nominal NUMERIC 
) 
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public' 
AS $function$ 
DECLARE 
  adjustment_id INTEGER; 
BEGIN 
  -- Insert profit adjustment record 
  INSERT INTO profit_adjustments ( 
    operational_id, 
    tanggal, 
    divisi, 
    kategori, 
    deskripsi, 
    nominal, 
    adjustment_type, 
    status 
  ) VALUES ( 
    p_operational_id, 
    p_tanggal, 
    p_divisi, 
    p_kategori, 
    p_deskripsi, 
    p_nominal, 
    'deduction', 
    'active' 
  ) RETURNING id INTO adjustment_id; 
  
  RETURN adjustment_id; 
END; 
$function$; 

-- Create function to restore profit 
CREATE OR REPLACE FUNCTION public.restore_profit( 
  p_operational_id UUID 
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public' 
AS $function$ 
DECLARE 
  adjustment_record RECORD; 
  restoration_id INTEGER; 
BEGIN 
  -- Find the active deduction record 
  SELECT * INTO adjustment_record 
  FROM profit_adjustments 
  WHERE operational_id = p_operational_id 
    AND adjustment_type = 'deduction' 
    AND status = 'active' 
  LIMIT 1; 
  
  IF NOT FOUND THEN 
    RETURN FALSE; 
  END IF; 
  
  -- Mark the deduction as reversed 
  UPDATE profit_adjustments 
  SET status = 'reversed', 
      updated_at = now() 
  WHERE id = adjustment_record.id; 
  
  -- Create restoration record 
  INSERT INTO profit_adjustments ( 
    operational_id, 
    tanggal, 
    divisi, 
    kategori, 
    deskripsi, 
    nominal, 
    adjustment_type, 
    status 
  ) VALUES ( 
    adjustment_record.operational_id, 
    adjustment_record.tanggal, 
    adjustment_record.divisi, 
    adjustment_record.kategori, 
    adjustment_record.deskripsi, 
    adjustment_record.nominal, 
    'restoration', 
    'active' 
  ) RETURNING id INTO restoration_id; 
  
  RETURN TRUE; 
END; 
$function$; 

-- Create function to get total profit adjustments 
CREATE OR REPLACE FUNCTION public.get_profit_adjustments_total( 
  p_divisi VARCHAR DEFAULT NULL, 
  p_start_date DATE DEFAULT NULL, 
  p_end_date DATE DEFAULT NULL 
) 
RETURNS TABLE ( 
  total_deductions NUMERIC, 
  total_restorations NUMERIC, 
  net_adjustment NUMERIC 
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public' 
AS $function$ 
BEGIN 
  RETURN QUERY 
  SELECT 
    COALESCE(SUM(CASE WHEN adjustment_type = 'deduction' AND status = 'active' THEN nominal ELSE 0 END), 0) as total_deductions, 
    COALESCE(SUM(CASE WHEN adjustment_type = 'restoration' AND status = 'active' THEN nominal ELSE 0 END), 0) as total_restorations, 
    COALESCE(SUM(CASE WHEN adjustment_type = 'restoration' AND status = 'active' THEN nominal ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN adjustment_type = 'deduction' AND status = 'active' THEN nominal ELSE 0 END), 0) as net_adjustment 
  FROM profit_adjustments 
  WHERE (p_divisi IS NULL OR divisi = p_divisi) 
    AND (p_start_date IS NULL OR tanggal >= p_start_date) 
    AND (p_end_date IS NULL OR tanggal <= p_end_date); 
END; 
$function$; 

-- Create view for profit adjustments with operational details 
CREATE OR REPLACE VIEW public.profit_adjustments_view AS 
SELECT 
  pa.*, 
  o.tanggal as operational_tanggal, 
  o.kategori as operational_kategori, 
  o.deskripsi as operational_deskripsi, 
  o.nominal as operational_nominal, 
  o.divisi as operational_divisi 
FROM profit_adjustments pa 
LEFT JOIN operational o ON pa.operational_id = o.id;
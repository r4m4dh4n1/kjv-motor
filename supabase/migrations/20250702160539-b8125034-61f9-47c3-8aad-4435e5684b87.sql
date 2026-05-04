-- Create operational table
CREATE TABLE public.operational (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL,
  kategori TEXT NOT NULL,
  nominal NUMERIC NOT NULL,
  deskripsi TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  divisi TEXT NOT NULL,
  cabang_id INTEGER NOT NULL REFERENCES cabang(id) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.operational ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" 
ON public.operational 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for all users" 
ON public.operational 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update access for all users" 
ON public.operational 
FOR UPDATE 
USING (true);

CREATE POLICY "Enable delete access for all users" 
ON public.operational 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operational_updated_at
BEFORE UPDATE ON public.operational
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add company_id to pembukuan table
ALTER TABLE public.pembukuan 
ADD COLUMN company_id INTEGER REFERENCES public.companies(id);
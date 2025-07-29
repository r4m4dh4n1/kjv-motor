-- Make jenis_motor column optional in biro_jasa table
ALTER TABLE public.biro_jasa ALTER COLUMN jenis_motor DROP NOT NULL;
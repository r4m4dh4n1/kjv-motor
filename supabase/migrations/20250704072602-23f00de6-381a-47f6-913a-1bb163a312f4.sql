-- Create function to update company modal safely
CREATE OR REPLACE FUNCTION update_company_modal(company_id bigint, amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE companies 
  SET modal = modal + amount
  WHERE id = company_id;
END;
$$;
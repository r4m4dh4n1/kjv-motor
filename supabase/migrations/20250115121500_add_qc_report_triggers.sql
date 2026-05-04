-- Recalculate qc_report.real_nominal_qc and keterangan for a pembelian
CREATE OR REPLACE FUNCTION public.recalc_qc_report(p_pembelian_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_exists boolean;
	v_estimasi numeric := 0;
	v_real numeric := 0;
	v_from_price numeric := 0;
	v_from_qc numeric := 0;
BEGIN
	-- Only proceed if a qc_report row already exists for this pembelian
	SELECT EXISTS(SELECT 1 FROM qc_report WHERE pembelian_id = p_pembelian_id) INTO v_exists;
	IF NOT v_exists THEN
		RETURN; -- nothing to do
	END IF;

	-- Sum biaya_qc from price_histories_pembelian
	SELECT COALESCE(SUM(biaya_qc), 0)
	INTO v_from_price
	FROM price_histories_pembelian
	WHERE pembelian_id = p_pembelian_id;

	-- Sum total_pengeluaran from qc_history
	SELECT COALESCE(SUM(total_pengeluaran), 0)
	INTO v_from_qc
	FROM qc_history
	WHERE pembelian_id = p_pembelian_id;

	v_real := COALESCE(v_from_price, 0) + COALESCE(v_from_qc, 0);

	-- Fetch current estimasi from qc_report
	SELECT COALESCE(estimasi_nominal_qc, 0)
	INTO v_estimasi
	FROM qc_report
	WHERE pembelian_id = p_pembelian_id;

	-- Update qc_report with new real and keterangan
	UPDATE qc_report
	SET
		real_nominal_qc = v_real,
		keterangan = CASE
			WHEN v_estimasi > v_real THEN 'Estimasi QC lebih Besar'
			WHEN v_estimasi < v_real THEN 'Estimasi QC kurang'
			ELSE 'Estimasi QC sama dengan Real QC'
		END,
		updated_at = timezone('utc'::text, now())
	WHERE pembelian_id = p_pembelian_id;
END;
$$;

-- Trigger function for price_histories_pembelian
CREATE OR REPLACE FUNCTION public.trg_qc_report_from_price_histories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_pembelian_id bigint;
BEGIN
	v_pembelian_id := COALESCE(NEW.pembelian_id, OLD.pembelian_id);
	IF v_pembelian_id IS NOT NULL THEN
		PERFORM public.recalc_qc_report(v_pembelian_id);
	END IF;
	RETURN NULL; -- statement-level side-effect only
END;
$$;

-- Apply trigger on insert/update of biaya_qc and delete
DROP TRIGGER IF EXISTS trg_after_price_histories_qc_report ON public.price_histories_pembelian;
CREATE TRIGGER trg_after_price_histories_qc_report
AFTER INSERT OR UPDATE OF biaya_qc OR DELETE ON public.price_histories_pembelian
FOR EACH ROW
EXECUTE FUNCTION public.trg_qc_report_from_price_histories();

-- Trigger function for qc_history
CREATE OR REPLACE FUNCTION public.trg_qc_report_from_qc_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_pembelian_id bigint;
BEGIN
	v_pembelian_id := COALESCE(NEW.pembelian_id, OLD.pembelian_id);
	IF v_pembelian_id IS NOT NULL THEN
		PERFORM public.recalc_qc_report(v_pembelian_id);
	END IF;
	RETURN NULL;
END;
$$;

-- Apply trigger on qc_history insert/update/delete to stay in sync as well
DROP TRIGGER IF EXISTS trg_after_qc_history_qc_report ON public.qc_history;
CREATE TRIGGER trg_after_qc_history_qc_report
AFTER INSERT OR UPDATE OR DELETE ON public.qc_history
FOR EACH ROW
EXECUTE FUNCTION public.trg_qc_report_from_qc_history();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_price_histories_pembelian_pid ON public.price_histories_pembelian(pembelian_id);
CREATE INDEX IF NOT EXISTS idx_qc_history_pid ON public.qc_history(pembelian_id);

-- Atomically initialize and increment the invoice counter for a year.
CREATE OR REPLACE FUNCTION next_invoice_counter(counter_year smallint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value integer;
BEGIN
  INSERT INTO invoice_counters (year, counter)
  VALUES (counter_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET counter = invoice_counters.counter + 1
  RETURNING counter INTO next_value;

  RETURN next_value;
END;
$$;

REVOKE ALL ON FUNCTION next_invoice_counter(smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_invoice_counter(smallint) TO service_role;
-- =====================================================================
-- EXTRACT_ALL_TEMPLATE_METADATA
--
-- Batch driver: runs EXTRACT_TEMPLATE_METADATA once for every template
-- registered in REPORT_TEMPLATES (that table is what maps a stage file to a
-- TEMPLATE_ID, and TEMPLATE_METADATA is keyed by TEMPLATE_ID).
--
-- Each template is extracted and committed independently, so one unreadable
-- workbook is recorded as an error and does NOT stop the rest. Returns a
-- per-template summary object.
--
--   CALL SE_DEMO_DB.JHI_HEDS_DEMO.EXTRACT_ALL_TEMPLATE_METADATA();
-- =====================================================================

CREATE OR REPLACE PROCEDURE SE_DEMO_DB.JHI_HEDS_DEMO.EXTRACT_ALL_TEMPLATE_METADATA()
RETURNS VARIANT
LANGUAGE SQL
EXECUTE AS CALLER
AS
$$
DECLARE
  results  ARRAY   := ARRAY_CONSTRUCT();
  tid      STRING;
  summary  STRING;
  ok       INTEGER := 0;
  failed   INTEGER := 0;
  c CURSOR FOR
    SELECT TEMPLATE_ID
    FROM SE_DEMO_DB.JHI_HEDS_DEMO.REPORT_TEMPLATES
    ORDER BY TEMPLATE_ID;
BEGIN
  FOR rec IN c DO
    tid := rec.TEMPLATE_ID;
    -- The inner procedure returns a JSON summary on success, or a string
    -- starting with 'ERROR' on failure (it never throws), so the loop
    -- continues either way.
    summary := (CALL SE_DEMO_DB.JHI_HEDS_DEMO.EXTRACT_TEMPLATE_METADATA(:tid));
    IF (STARTSWITH(summary, 'ERROR')) THEN
      failed := failed + 1;
      results := ARRAY_APPEND(results,
        OBJECT_CONSTRUCT('template_id', :tid, 'status', 'ERROR', 'message', summary));
    ELSE
      ok := ok + 1;
      results := ARRAY_APPEND(results, TRY_PARSE_JSON(summary));
    END IF;
  END FOR;

  RETURN OBJECT_CONSTRUCT(
    'templates_processed', ok,
    'templates_failed',    failed,
    'details',             results);
END;
$$;

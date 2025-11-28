-- Backfill human-readable start_time/end_time from existing timestamptz columns
-- Run this after you've applied `add_seminar_time_columns.sql`.

-- Update start_time where it's null but start_datetime exists
-- Use a plpgsql block to detect column type and update safely.
DO $$
DECLARE
  col_type_start text;
  col_type_end text;
BEGIN
  SELECT data_type INTO col_type_start
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'seminars' AND column_name = 'start_time';

  SELECT data_type INTO col_type_end
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'seminars' AND column_name = 'end_time';

  -- Handle start_time depending on its column type
  IF col_type_start IS NULL THEN
    RAISE NOTICE 'Column start_time not found on seminars — skipping start_time backfill.';
  ELSIF col_type_start IN ('text', 'character varying') THEN
    UPDATE seminars
    SET start_time = to_char(start_datetime, 'HH12:MI AM')
    WHERE start_datetime IS NOT NULL
      AND (start_time IS NULL OR start_time::text = '');
    RAISE NOTICE 'Backfilled start_time (text) from start_datetime.';
  ELSIF col_type_start = 'timestamp without time zone' THEN
    UPDATE seminars
    SET start_time = start_datetime::timestamp
    WHERE start_datetime IS NOT NULL
      AND start_time IS NULL;
    RAISE NOTICE 'Backfilled start_time (timestamp without time zone) from start_datetime.';
  ELSIF col_type_start = 'timestamp with time zone' THEN
    UPDATE seminars
    SET start_time = start_datetime
    WHERE start_datetime IS NOT NULL
      AND start_time IS NULL;
    RAISE NOTICE 'Backfilled start_time (timestamptz) from start_datetime.';
  ELSE
    RAISE NOTICE 'start_time has unexpected type % — skipping start_time backfill.', col_type_start;
  END IF;

  -- Handle end_time depending on its column type
  IF col_type_end IS NULL THEN
    RAISE NOTICE 'Column end_time not found on seminars — skipping end_time backfill.';
  ELSIF col_type_end IN ('text', 'character varying') THEN
    UPDATE seminars
    SET end_time = to_char(end_datetime, 'HH12:MI AM')
    WHERE end_datetime IS NOT NULL
      AND (end_time IS NULL OR end_time::text = '');
    RAISE NOTICE 'Backfilled end_time (text) from end_datetime.';
  ELSIF col_type_end = 'timestamp without time zone' THEN
    UPDATE seminars
    SET end_time = end_datetime::timestamp
    WHERE end_datetime IS NOT NULL
      AND end_time IS NULL;
    RAISE NOTICE 'Backfilled end_time (timestamp without time zone) from end_datetime.';
  ELSIF col_type_end = 'timestamp with time zone' THEN
    UPDATE seminars
    SET end_time = end_datetime
    WHERE end_datetime IS NOT NULL
      AND end_time IS NULL;
    RAISE NOTICE 'Backfilled end_time (timestamptz) from end_datetime.';
  ELSE
    RAISE NOTICE 'end_time has unexpected type % — skipping end_time backfill.', col_type_end;
  END IF;
END
$$;

-- Optionally, for older rows that stored only `start_time` text but not `start_datetime`,
-- you could try to build start_datetime from the `date` + `start_time` fields, but
-- that is error-prone across timezones and ambiguous formats. Run the following only
-- if you know your `start_time` values are parseable and your DB timezone is correct.
--
-- UPDATE seminars
-- SET start_datetime = (date + (start_time::text || ' UTC')::timestamptz)
-- WHERE start_datetime IS NULL AND start_time IS NOT NULL AND date IS NOT NULL;

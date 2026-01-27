-- Add 'in_progress' to trip_status enum if it doesn't exist
-- This fixes the issue where the database enum is out of sync with the schema

DO $$ 
BEGIN
    -- Check if 'in_progress' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'in_progress' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trip_status')
    ) THEN
        -- Add 'in_progress' to the enum
        ALTER TYPE trip_status ADD VALUE 'in_progress';
    END IF;
END $$;

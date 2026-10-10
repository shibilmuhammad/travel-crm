-- UNZOLO CRM Database Schema for Supabase SQL Editor

-- 1. Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password TEXT,
  role TEXT DEFAULT 'telecaller',
  employee_id TEXT,
  daily_call_target INT DEFAULT 0,
  daily_conversion_target INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_login TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  whatsapp_profile_name TEXT,
  destination TEXT,
  preferred_destination TEXT,
  preferred_date TEXT,
  preferred_travel_date TEXT,
  date_flexibility TEXT,
  pax_count INT DEFAULT 1,
  number_of_travellers INT DEFAULT 1,
  departure_city TEXT,
  lead_temperature TEXT DEFAULT 'new',
  interest_level TEXT DEFAULT 'new',
  booking_stage TEXT DEFAULT 'not_contacted',
  lead_source TEXT DEFAULT 'manual_entry',
  assigned_team_member TEXT,
  batch_id TEXT,
  budget TEXT,
  budget_per_person NUMERIC,
  advance_amount NUMERIC,
  payment_date TEXT,
  next_followup_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure any existing leads table gets updated with new columns
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS preferred_destination TEXT,
ADD COLUMN IF NOT EXISTS preferred_travel_date TEXT,
ADD COLUMN IF NOT EXISTS number_of_travellers INT,
ADD COLUMN IF NOT EXISTS budget_per_person NUMERIC,
ADD COLUMN IF NOT EXISTS advance_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_date TEXT,
ADD COLUMN IF NOT EXISTS next_followup_date TEXT,
ADD COLUMN IF NOT EXISTS interest_level TEXT;

-- 3. Trip Batches Table
CREATE TABLE IF NOT EXISTS public.trip_batches (
  id TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  proposed_date TEXT NOT NULL,
  title TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'proposed',
  proposed_price NUMERIC,
  price_per_pax NUMERIC,
  capacity INT DEFAULT 20,
  departure_city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure trip_batches has all columns
ALTER TABLE public.trip_batches 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS start_date TEXT,
ADD COLUMN IF NOT EXISTS end_date TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'proposed',
ADD COLUMN IF NOT EXISTS proposed_price NUMERIC,
ADD COLUMN IF NOT EXISTS price_per_pax NUMERIC,
ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 20,
ADD COLUMN IF NOT EXISTS departure_city TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Lead Activities Table
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  notes TEXT,
  outcome TEXT,
  next_action TEXT,
  next_followup_date TEXT,
  team_member TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security (RLS) for seamless client/server CRUD
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities DISABLE ROW LEVEL SECURITY;

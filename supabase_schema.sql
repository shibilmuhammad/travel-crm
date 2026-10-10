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
  preferred_date TEXT,
  date_flexibility TEXT,
  pax_count INT DEFAULT 1,
  departure_city TEXT,
  lead_temperature TEXT DEFAULT 'new',
  booking_stage TEXT DEFAULT 'not_contacted',
  lead_source TEXT DEFAULT 'manual_entry',
  assigned_team_member TEXT,
  batch_id TEXT,
  budget TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Disable Row Level Security (RLS) for seamless client/server CRUD or enable public policies
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Travel CRM — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor to set up all tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO team_members (name, email) VALUES
  ('Admin', 'admin@travelcrm.com')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  whatsapp_profile_name TEXT,
  preferred_destination TEXT,
  preferred_travel_date DATE,
  date_flexibility TEXT NOT NULL DEFAULT 'not_decided'
    CHECK (date_flexibility IN ('specific_date_only','flexible_within_range','any_future_batch','not_decided')),
  departure_city TEXT,
  number_of_travellers INTEGER NOT NULL DEFAULT 1,
  budget_per_person NUMERIC(10,2),
  interest_level TEXT NOT NULL DEFAULT 'new'
    CHECK (interest_level IN ('new','low_interest','interested','high_intent','not_interested')),
  booking_stage TEXT NOT NULL DEFAULT 'not_contacted'
    CHECK (booking_stage IN (
      'not_contacted','contacted','follow_up_required','waiting_for_date',
      'waiting_for_price','ready_to_book','advance_paid','booking_confirmed','lost_closed'
    )),
  preferred_contact_method TEXT,
  last_contacted_date TIMESTAMPTZ,
  next_followup_date DATE,
  next_followup_time TIME,
  assigned_team_member UUID REFERENCES team_members(id),
  lead_source TEXT CHECK (lead_source IN (
    'whatsapp','instagram','facebook','google_ads','referral','walk_in','website','other'
  )),
  ad_campaign TEXT,
  ad_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_destination ON leads(preferred_destination);
CREATE INDEX IF NOT EXISTS idx_leads_travel_date ON leads(preferred_travel_date);
CREATE INDEX IF NOT EXISTS idx_leads_interest_level ON leads(interest_level);
CREATE INDEX IF NOT EXISTS idx_leads_booking_stage ON leads(booking_stage);
CREATE INDEX IF NOT EXISTS idx_leads_followup_date ON leads(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD ACTIVITIES (Append-only call notes / interaction history)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'general_note'
    CHECK (activity_type IN ('phone_call','whatsapp_message','follow_up','booking_update','general_note')),
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  outcome TEXT,
  next_action TEXT,
  next_followup_date DATE,
  team_member TEXT,
  -- Snapshot of changes made during this activity
  updated_interest_level TEXT CHECK (updated_interest_level IN (
    'new','low_interest','interested','high_intent','not_interested'
  )),
  updated_booking_stage TEXT CHECK (updated_booking_stage IN (
    'not_contacted','contacted','follow_up_required','waiting_for_date',
    'waiting_for_price','ready_to_book','advance_paid','booking_confirmed','lost_closed'
  )),
  updated_preferred_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON lead_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_followup ON lead_activities(next_followup_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIP BATCHES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination TEXT NOT NULL,
  proposed_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','validating_demand','open_for_booking','confirmed','cancelled')),
  proposed_price NUMERIC(10,2),
  capacity INTEGER,
  minimum_viable_size INTEGER,
  departure_city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS batches_updated_at ON trip_batches;
CREATE TRIGGER batches_updated_at
  BEFORE UPDATE ON trip_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- BATCH LEADS (junction table)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES trip_batches(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_leads_batch ON batch_leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_leads_lead ON batch_leads(lead_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA — Sample destinations & leads for demo
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO leads (
  full_name, whatsapp_number, preferred_destination, preferred_travel_date,
  date_flexibility, departure_city, number_of_travellers,
  budget_per_person, interest_level, booking_stage, lead_source, notes
) VALUES
  ('Arun Kumar', '+919876543210', 'Vattavada', '2026-10-21', 'specific_date_only', 'Kochi', 2, 3500, 'high_intent', 'ready_to_book', 'instagram', 'Very keen, called twice'),
  ('Priya Menon', '+919876543211', 'Munnar', '2026-10-28', 'flexible_within_range', 'Thrissur', 3, 4000, 'interested', 'follow_up_required', 'whatsapp', 'Waiting for friend confirmation'),
  ('Rahul Nair', '+919876543212', 'Vattavada', '2026-10-21', 'specific_date_only', 'Kochi', 1, 3500, 'high_intent', 'advance_paid', 'instagram', 'Advance paid ₹1000'),
  ('Sneha Pillai', '+919876543213', 'Wayanad', '2026-11-04', 'flexible_within_range', 'Kozhikode', 4, 5000, 'interested', 'waiting_for_price', 'facebook', ''),
  ('Vishnu Raj', '+919876543214', 'Munnar', NULL, 'any_future_batch', 'Kochi', 2, 3000, 'low_interest', 'contacted', 'google_ads', 'Not ready yet'),
  ('Anjali Das', '+919876543215', 'Vattavada', '2026-10-28', 'flexible_within_range', 'Kochi', 2, 3500, 'high_intent', 'ready_to_book', 'referral', 'Referred by Rahul'),
  ('Mohammed Ali', '+919876543216', 'Thekkady', '2026-11-10', 'specific_date_only', 'Kozhikode', 3, 4500, 'interested', 'follow_up_required', 'whatsapp', ''),
  ('Lakshmi Iyer', '+919876543217', 'Vattavada', '2026-10-21', 'specific_date_only', 'Chennai', 2, 4000, 'high_intent', 'waiting_for_price', 'instagram', 'Budget slightly higher'),
  ('Deepak Sharma', '+919876543218', 'Munnar', '2026-10-28', 'flexible_within_range', 'Bangalore', 2, 3500, 'interested', 'not_contacted', 'google_ads', ''),
  ('Kavitha Nambiar', '+919876543219', 'Thekkady', NULL, 'any_future_batch', 'Kochi', 5, 5000, 'new', 'not_contacted', 'website', 'Group of 5'),
  ('Suresh Babu', '+919876543220', 'Wayanad', '2026-11-04', 'specific_date_only', 'Thrissur', 2, 4000, 'high_intent', 'booking_confirmed', 'referral', 'Confirmed'),
  ('Meera Thomas', '+919876543221', 'Vattavada', '2026-10-28', 'flexible_within_range', 'Kochi', 3, 3500, 'interested', 'follow_up_required', 'instagram', ''),
  ('Rajan Krishnan', '+919876543222', 'Munnar', '2026-11-15', 'flexible_within_range', 'Bangalore', 2, 4500, 'low_interest', 'contacted', 'facebook', ''),
  ('Pooja Warrier', '+919876543223', 'Vattavada', '2026-10-21', 'specific_date_only', 'Kochi', 1, 3500, 'high_intent', 'advance_paid', 'whatsapp', 'Advance paid'),
  ('Ajith Chandran', '+919876543224', 'Wayanad', NULL, 'not_decided', 'Thrissur', 2, 3000, 'new', 'not_contacted', 'instagram', ''),
  ('Nithya Gopal', '+919876543225', 'Thekkady', '2026-11-10', 'flexible_within_range', 'Kochi', 4, 4000, 'interested', 'waiting_for_date', 'referral', ''),
  ('Sanjay Menon', '+919876543226', 'Munnar', '2026-10-28', 'specific_date_only', 'Bangalore', 2, 5000, 'high_intent', 'ready_to_book', 'instagram', ''),
  ('Divya Nair', '+919876543227', 'Vattavada', NULL, 'any_future_batch', 'Kochi', 3, 3500, 'interested', 'follow_up_required', 'whatsapp', ''),
  ('Kiran Kumar', '+919876543228', 'Wayanad', '2026-11-04', 'flexible_within_range', 'Kozhikode', 2, 4000, 'high_intent', 'waiting_for_price', 'facebook', ''),
  ('Reshma Philip', '+919876543229', 'Munnar', NULL, 'not_decided', 'Kochi', 2, 3000, 'not_interested', 'lost_closed', 'google_ads', 'Too expensive')
ON CONFLICT DO NOTHING;

-- Sample activities
INSERT INTO lead_activities (lead_id, activity_type, activity_date, notes, outcome, next_action, next_followup_date, team_member)
SELECT 
  id, 'phone_call', NOW() - INTERVAL '2 days',
  'Called customer. Interested in Vattavada on Oct 21. Will come with one friend. Price acceptable.',
  'Interested, wants confirmation', 'Send payment details', NOW()::DATE + 2,
  'Admin'
FROM leads WHERE full_name = 'Arun Kumar'
ON CONFLICT DO NOTHING;

INSERT INTO lead_activities (lead_id, activity_type, activity_date, notes, outcome, next_action, next_followup_date, team_member)
SELECT 
  id, 'phone_call', NOW() - INTERVAL '1 day',
  'Called. Waiting for friend to confirm. Will call back in 3 days.',
  'Waiting for friends', 'Call again', NOW()::DATE + 3,
  'Admin'
FROM leads WHERE full_name = 'Priya Menon'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (basic — open for now, add auth later)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (development mode — tighten for production)
CREATE POLICY "Allow all for anon" ON leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON lead_activities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON trip_batches FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON batch_leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON team_members FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  age INTEGER,
  location TEXT,
  preferred_call_time TIME,
  phone_number TEXT NOT NULL,
  family_member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  voice VARCHAR DEFAULT 'nova' CHECK (voice IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'))
);

-- Calls table (with integrated response data)
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  call_sid TEXT UNIQUE, -- Twilio Call SID
  call_date DATE DEFAULT CURRENT_DATE,
  call_start_time TIMESTAMPTZ,
  call_duration INTEGER, -- in seconds
  status TEXT CHECK (status IN ('initiated', 'in_progress', 'completed', 'failed')),
  recording_url TEXT,
  response_data JSONB, -- Contains: overall_mood, todays_agenda, game_result, call_summary, call_transcript
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients table
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT USING (auth.uid() = family_member_id);

CREATE POLICY "Users can create their own patients" ON patients
  FOR INSERT WITH CHECK (auth.uid() = family_member_id);

CREATE POLICY "Users can update their own patients" ON patients
  FOR UPDATE USING (auth.uid() = family_member_id);

CREATE POLICY "Users can delete their own patients" ON patients
  FOR DELETE USING (auth.uid() = family_member_id);

-- RLS Policies for calls table
CREATE POLICY "Users can view calls for their patients" ON calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = calls.patient_id
      AND patients.family_member_id = auth.uid()
    )
  );

CREATE POLICY "Service role can create calls" ON calls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update calls" ON calls
  FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_patients_family_member_id ON patients(family_member_id);
CREATE INDEX idx_calls_patient_id ON calls(patient_id);
CREATE INDEX idx_calls_call_date ON calls(call_date);
CREATE INDEX idx_calls_status ON calls(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for patients table
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
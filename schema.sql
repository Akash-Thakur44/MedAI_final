-- =======================================================
-- MEDAI DATABASE SCHEMA
-- Execute this script in your Supabase SQL Editor
-- =======================================================

-- Enable UUID extension (for generating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    age INTEGER,
    gender TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 2. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    location TEXT NOT NULL,
    email TEXT UNIQUE,
    contact TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    experience_years INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SYMPTOMS LOG TABLE
CREATE TABLE IF NOT EXISTS symptoms_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symptoms_text TEXT NOT NULL,
    input_type TEXT DEFAULT 'text',
    age INTEGER,
    gender TEXT,
    duration TEXT,
    additional_notes TEXT,
    image_urls TEXT[],
    image_types TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DIAGNOSES TABLE
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symptom_log_id UUID NOT NULL REFERENCES symptoms_log(id) ON DELETE CASCADE,
    probable_diseases JSONB DEFAULT '[]'::jsonb,
    primary_disease TEXT NOT NULL,
    confidence_score NUMERIC(5, 2) DEFAULT 0.0,
    severity TEXT NOT NULL,
    description TEXT,
    precautions JSONB DEFAULT '[]'::jsonb,
    specialist_type TEXT DEFAULT 'General Physician',
    ai_raw_response TEXT,
    has_recommendation BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnosis_id UUID NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    reason TEXT,
    urgency TEXT DEFAULT 'routine',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    diagnosis_id UUID REFERENCES diagnoses(id) ON DELETE SET NULL,
    symptom_log_id UUID REFERENCES symptoms_log(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    web_sources JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_symptoms_user ON symptoms_log(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_log ON diagnoses(symptom_log_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- =======================================================
-- SEED DATA FOR RECOMMENDATIONS SYSTEM
-- =======================================================
INSERT INTO doctors (name, specialty, location, email, contact, rating, experience_years, available, image_url) VALUES
('Dr. Ramesh Patel', 'General Physician', 'Mumbai, India', 'ramesh.patel@medai.com', '+91 98765 43210', 4.8, 15, TRUE, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'),
('Dr. Sarah Al-Jamil', 'General Physician', 'Delhi, India', 'sarah.jamil@medai.com', '+91 98765 43211', 4.7, 10, TRUE, 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200'),
('Dr. Anita Sharma', 'Cardiologist', 'Bangalore, India', 'anita.sharma@medai.com', '+91 98765 43212', 4.9, 18, TRUE, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'),
('Dr. David Kogan', 'Cardiologist', 'Mumbai, India', 'david.kogan@medai.com', '+91 98765 43213', 4.6, 12, TRUE, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'),
('Dr. Priya Iyer', 'Dermatologist', 'Chennai, India', 'priya.iyer@medai.com', '+91 98765 43214', 4.8, 8, TRUE, 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200'),
('Dr. Amit Verma', 'Dermatologist', 'Delhi, India', 'amit.verma@medai.com', '+91 98765 43215', 4.5, 9, TRUE, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'),
('Dr. Kabir Mehta', 'Neurologist', 'Bangalore, India', 'kabir.mehta@medai.com', '+91 98765 43216', 4.9, 20, TRUE, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'),
('Dr. Meera Sen', 'Neurologist', 'Kolkata, India', 'meera.sen@medai.com', '+91 98765 43217', 4.7, 11, TRUE, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'),
('Dr. Rohan Das', 'Pediatrician', 'Kolkata, India', 'rohan.das@medai.com', '+91 98765 43218', 4.8, 14, TRUE, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200'),
('Dr. Lisa Chang', 'Pediatrician', 'Bangalore, India', 'lisa.chang@medai.com', '+91 98765 43219', 4.6, 7, TRUE, 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200'),
('Dr. Rajesh Pillai', 'Orthopedic Surgeon', 'Chennai, India', 'rajesh.pillai@medai.com', '+91 98765 43220', 4.7, 16, TRUE, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'),
('Dr. Elena Rostova', 'Orthopedic Surgeon', 'Delhi, India', 'elena.rostova@medai.com', '+91 98765 43221', 4.8, 13, TRUE, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200')
ON CONFLICT (email) DO NOTHING;

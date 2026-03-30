-- ═══════════════════════════════════════════════════════════════
-- PRI Platform — PostgreSQL Schema
-- Run this in psql: \i schema.sql
-- ═══════════════════════════════════════════════════════════════

-- Users table (auth + role)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  role          VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  avatar_url    VARCHAR(500),
  created_at    TIMESTAMP DEFAULT NOW(),
  last_login    TIMESTAMP
);

-- Student profiles (linked 1:1 to user)
CREATE TABLE IF NOT EXISTS student_profiles (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  field           VARCHAR(255),
  gpa             DECIMAL(4,2),
  target_role     VARCHAR(255),
  target_salary   VARCHAR(100),
  company_type    VARCHAR(100),
  timeline        VARCHAR(100),
  skills          TEXT[],
  certifications  TEXT[],
  github_username VARCHAR(255),
  linkedin_url    VARCHAR(500),
  leetcode_username VARCHAR(255),
  english_level   VARCHAR(50),
  has_internship  BOOLEAN DEFAULT FALSE,
  internship_field VARCHAR(255),
  internship_duration INTEGER,
  internship_grade VARCHAR(10),
  supervisor_rating INTEGER,
  got_job_offer   BOOLEAN,
  hackathons      INTEGER DEFAULT 0,
  cocurricular    INTEGER DEFAULT 0,
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Resumes (cloudinary storage)
CREATE TABLE IF NOT EXISTS resumes (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cloudinary_url  VARCHAR(500) NOT NULL,
  cloudinary_id   VARCHAR(255) NOT NULL,
  filename        VARCHAR(255),
  extracted_text  TEXT,
  uploaded_at     TIMESTAMP DEFAULT NOW(),
  is_active       BOOLEAN DEFAULT TRUE
);

-- Career analysis scores (history over time)
CREATE TABLE IF NOT EXISTS career_scores (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  overall_score   INTEGER NOT NULL,
  internship_score INTEGER,
  skills_score    INTEGER,
  academic_score  INTEGER,
  activities_score INTEGER,
  resume_score    INTEGER,
  readiness_level VARCHAR(50),
  target_role     VARCHAR(255),
  gaps            JSONB,
  strengths       JSONB,
  roadmap         JSONB,
  resume_feedback JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- GitHub data cache (refresh every 24h)
CREATE TABLE IF NOT EXISTS github_data (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username        VARCHAR(255),
  public_repos    INTEGER,
  top_languages   TEXT[],
  total_stars     INTEGER,
  contributions   INTEGER,
  top_repos       JSONB,
  fetched_at      TIMESTAMP DEFAULT NOW()
);

-- LeetCode data cache
CREATE TABLE IF NOT EXISTS leetcode_data (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username        VARCHAR(255),
  total_solved    INTEGER,
  easy_solved     INTEGER,
  medium_solved   INTEGER,
  hard_solved     INTEGER,
  acceptance_rate DECIMAL(5,2),
  ranking         INTEGER,
  fetched_at      TIMESTAMP DEFAULT NOW()
);

-- PRI challenge sessions (existing, now linked to user)
CREATE TABLE IF NOT EXISTS challenge_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id      VARCHAR(255) UNIQUE NOT NULL,
  challenge_id    VARCHAR(50),
  prompt_score    DECIMAL(4,3),
  bug_detection   DECIMAL(4,3),
  reasoning_depth DECIMAL(4,3),
  pri_total       DECIMAL(4,3),
  detected_bug    BOOLEAN,
  summary         TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_scores_user ON career_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_career_scores_created ON career_scores(created_at);
CREATE INDEX IF NOT EXISTS idx_challenge_sessions_user ON challenge_sessions(user_id);

-- Default admin user (change password after setup!)
-- Password: admin123 (bcrypt hash below)
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@pri.dev', '$2b$10$rJ9tqZqZ1n1n1n1n1n1n1uXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- HomeBoost / The Employee Benefit Program
-- Fresh Database Schema
-- Partnership Model Build
-- =========================================================
-- Recommended import:
-- 1) Open MySQL Workbench
-- 2) Run:
--      DROP DATABASE IF EXISTS homeboost;
--      CREATE DATABASE homeboost;
--      USE homeboost;
-- 3) Run this full file
--
-- Local client validation URLs:
-- http://localhost:5173/joessmokeshop
--
-- Seed users after import:
-- node src/seed/createAdminUser.js
-- node src/seed/createHBTUser.js
-- node src/seed/createEmployeeUser.js
-- =========================================================
USE project2;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS quiz_submissions;
DROP TABLE IF EXISTS quiz_options;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS quizzes;

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS pricing_plans;

DROP TABLE IF EXISTS section_cards;
DROP TABLE IF EXISTS page_sections;
DROP TABLE IF EXISTS pages;

DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS enrollment_batches;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS partnerships;
DROP TABLE IF EXISTS employers;
DROP TABLE IF EXISTS home_buying_teams;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- Core Partnership Tables
-- =========================================================

CREATE TABLE home_buying_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(500),
  brand_primary_color VARCHAR(50) DEFAULT '#111827',
  brand_secondary_color VARCHAR(50) DEFAULT '#F9FAFB',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500),
  address VARCHAR(255),
  phone VARCHAR(50),
  contact_email VARCHAR(255),
  website VARCHAR(255),
  brand_primary_color VARCHAR(50) DEFAULT '#000000',
  brand_secondary_color VARCHAR(50) DEFAULT '#ffffff',
  slug VARCHAR(150) UNIQUE NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE partnerships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  employer_id INT NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  status ENUM('pending', 'active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_partnership_team
    FOREIGN KEY (team_id) REFERENCES home_buying_teams(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_partnership_employer
    FOREIGN KEY (employer_id) REFERENCES employers(id)
    ON DELETE CASCADE
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'hbt_admin', 'hbt_member', 'employee') NOT NULL DEFAULT 'employee',
  team_id INT NULL,
  partnership_id INT NULL,
  enrollment_batch_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_team
    FOREIGN KEY (team_id) REFERENCES home_buying_teams(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_users_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE SET NULL
);

CREATE TABLE enrollment_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  uploaded_by_user_id INT NOT NULL,
  original_filename VARCHAR(255),
  created_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  status ENUM('active', 'revoked') DEFAULT 'active',
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_enrollment_batches_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_enrollment_batches_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_enrollment_batch
  FOREIGN KEY (enrollment_batch_id) REFERENCES enrollment_batches(id)
  ON DELETE SET NULL;

CREATE TABLE team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  team_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  bio TEXT,
  photo_url VARCHAR(500),
  booking_link VARCHAR(500),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_team_members_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_team_members_team
    FOREIGN KEY (team_id) REFERENCES home_buying_teams(id)
    ON DELETE CASCADE
);

-- =========================================================
-- Content Tables
-- =========================================================

CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  category VARCHAR(100),
  resource_type VARCHAR(100) DEFAULT 'article',
  image_url VARCHAR(500),
  resource_url VARCHAR(500),
  is_global TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_resources_team
    FOREIGN KEY (team_id) REFERENCES home_buying_teams(id)
    ON DELETE SET NULL
);

CREATE TABLE pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE page_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_id INT NOT NULL,
  section_key VARCHAR(150),
  title VARCHAR(255),
  subtitle VARCHAR(255),
  content TEXT,
  image_url VARCHAR(500),
  button_text VARCHAR(100),
  button_link VARCHAR(500),
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_page_sections_page
    FOREIGN KEY (page_id) REFERENCES pages(id)
    ON DELETE CASCADE
);

CREATE TABLE section_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  button_text VARCHAR(100),
  button_link VARCHAR(500),
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_section_cards_section
    FOREIGN KEY (section_id) REFERENCES page_sections(id)
    ON DELETE CASCADE
);

CREATE TABLE pricing_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  price VARCHAR(100),
  description TEXT,
  features TEXT,
  button_text VARCHAR(100),
  button_link VARCHAR(500),
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  page_slug VARCHAR(150) DEFAULT 'home',
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATETIME NULL,
  location VARCHAR(255),
  event_link VARCHAR(500),
  is_global TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_events_team
    FOREIGN KEY (team_id) REFERENCES home_buying_teams(id)
    ON DELETE SET NULL
);

-- =========================================================
-- Quiz Tables
-- =========================================================

CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_global TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quizzes_team
    FOREIGN KEY (team_id) REFERENCES home_buying_teams(id)
    ON DELETE SET NULL
);

CREATE TABLE quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'true_false', 'short_answer') DEFAULT 'multiple_choice',
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quiz_questions_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    ON DELETE CASCADE
);

CREATE TABLE quiz_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  display_order INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quiz_options_question
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
    ON DELETE CASCADE
);

CREATE TABLE quiz_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  partnership_id INT NULL,
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_quiz_submissions_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_quiz_submissions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_quiz_submissions_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE SET NULL
);

CREATE TABLE quiz_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option_id INT NULL,
  answer_text TEXT,
  is_correct TINYINT(1) DEFAULT 0,

  CONSTRAINT fk_quiz_answers_submission
    FOREIGN KEY (submission_id) REFERENCES quiz_submissions(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_quiz_answers_question
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_quiz_answers_option
    FOREIGN KEY (selected_option_id) REFERENCES quiz_options(id)
    ON DELETE SET NULL
);

-- =========================================================
-- Indexes
-- =========================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_partnership_id ON users(partnership_id);

CREATE INDEX idx_partnerships_team_id ON partnerships(team_id);
CREATE INDEX idx_partnerships_employer_id ON partnerships(employer_id);
CREATE INDEX idx_partnerships_slug ON partnerships(slug);

CREATE INDEX idx_employers_slug ON employers(slug);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

CREATE INDEX idx_resources_team_id ON resources(team_id);
CREATE INDEX idx_events_team_id ON events(team_id);

CREATE INDEX idx_quiz_submissions_user_id ON quiz_submissions(user_id);
CREATE INDEX idx_quiz_submissions_partnership_id ON quiz_submissions(partnership_id);

-- =========================================================
-- Client-Ready Seed Data
-- =========================================================

INSERT INTO home_buying_teams
(name, email, phone, website, description, logo_url, brand_primary_color, brand_secondary_color)
VALUES
(
  'HomeBoost Ottawa Team',
  'hbt@test.com',
  '613-555-0100',
  'https://theemployeebenefitprogram.com',
  'A modern home buying team that supports employees with mortgage guidance, realtor strategy, events, and personalized next steps.',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80',
  '#111827',
  '#F9FAFB'
);

INSERT INTO employers
(name, logo_url, address, phone, contact_email, website, brand_primary_color, brand_secondary_color, slug)
VALUES
(
  'Joe''s Smoke Shop',
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=900&q=80',
  '100 Partnership Street, Ottawa, ON',
  '613-555-0200',
  'contact@example.com',
  'https://example.com',
  '#7C2D12',
  '#FFF7ED',
  'joessmokeshop'
);

INSERT INTO partnerships
(team_id, employer_id, slug, status)
VALUES
(1, 1, 'joessmokeshop', 'active');

INSERT INTO team_members
(team_id, full_name, title, email, phone, bio, photo_url, booking_link)
VALUES
(1, 'John Smith', 'Mortgage Advisor', 'john@example.com', '613-555-0300', 'Helps employees understand mortgage options, pre-approval, affordability, and closing costs.', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80', 'https://calendly.com/homeboost-mortgage'),
(1, 'Sarah Lee', 'Realtor', 'sarah@example.com', '613-555-0400', 'Supports employees with home search, offer strategy, neighborhood planning, and buyer confidence.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80', 'https://calendly.com/homeboost-realtor'),
(1, 'Michael Brown', 'Financial Planner', 'michael@example.com', '613-555-0500', 'Helps employees build a practical savings plan for down payment, emergency fund, and monthly affordability.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80', 'https://calendly.com/homeboost-planner');

INSERT INTO pages (title, slug, description)
VALUES
('Home', 'home', 'Main public homepage'),
('Employee Portal', 'employee-portal', 'Employee portal content');

INSERT INTO page_sections
(page_id, section_key, title, subtitle, content, button_text, button_link, display_order, sort_order)
VALUES
(1, 'hero', 'Premium Home Buying Benefits for Employees', 'A beautiful branded portal that connects every employee to trusted home-buying guidance.', 'HomeBoost turns employer partnerships into a complete digital benefit experience with resources, quizzes, events, booking links, and role-based dashboards.', 'Open Portal', '/joessmokeshop', 1, 1),
(1, 'resources', 'Explore Real Home-Buying Content', 'Guides, checklists, calculators, events, and professional support in one place.', 'Employees get practical content that helps them move from curious to confident.', 'View Resources', '/resources', 2, 2),
(1, 'benefits', 'Built for Employer Partnerships', 'Every employer gets their own branded entry page.', 'A partnership connects one employer to one Home Buying Team, so the correct branding and content always follow the employee.', 'View Portal', '/joessmokeshop', 3, 3),
(1, 'support', 'Expert Support When Employees Are Ready', 'Mortgage, realtor, and planning experts are visible from the employee portal.', 'Employees can browse team members and book appointments when they need real guidance.', 'Login', '/login', 4, 4);

INSERT INTO section_cards
(section_id, title, description, image_url, button_text, button_link, display_order, sort_order)
VALUES
(2, 'First-Time Buyer Guide', 'A clear step-by-step roadmap from pre-approval to keys.', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80', 'Read Guide', '/resources', 1, 1),
(2, 'Mortgage Readiness Checklist', 'Know your credit, documents, savings, and budget before shopping.', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80', 'Open Checklist', '/resources', 2, 2),
(2, 'Book Trusted Experts', 'Connect with mortgage, realtor, and financial planning professionals.', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80', 'View Portal', '/joessmokeshop', 3, 3);

INSERT INTO resources
(team_id, title, description, content, category, resource_type, image_url, resource_url, is_global, display_order, sort_order)
VALUES
(NULL, 'First-Time Home Buyer Guide', 'A beginner-friendly guide for employees starting their home buying journey.', 'Understand budget, mortgage pre-approval, down payment, inspections, closing costs, and next steps.', 'Guide', 'article', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80', NULL, 1, 1, 1),
(1, 'Ottawa Mortgage Readiness Checklist', 'A local checklist from the Ottawa HBT.', 'Review income, credit, savings, documents, debt obligations, and target purchase price before applying.', 'Checklist', 'checklist', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80', NULL, 0, 2, 2),
(1, 'Down Payment Planning Toolkit', 'Tips for building a realistic down payment plan.', 'Create a monthly savings target, understand minimum down payment rules, and prepare your emergency fund.', 'Planning', 'toolkit', 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=900&q=80', NULL, 0, 3, 3),
(NULL, 'Closing Costs Explained', 'A simple overview of extra costs employees should prepare for.', 'Learn about land transfer tax, legal fees, inspection costs, moving costs, insurance, and adjustments.', 'Guide', 'article', 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=900&q=80', NULL, 1, 4, 4),
(1, 'Neighbourhood Search Strategy', 'How to compare commute, budget, schools, safety, and lifestyle before making offers.', 'Use a practical scoring method to compare homes and communities before rushing into a purchase.', 'Strategy', 'article', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80', NULL, 0, 5, 5);

INSERT INTO events
(team_id, title, description, event_date, location, event_link, is_global, is_active)
VALUES
(1, 'First-Time Buyer Webinar', 'A beginner-friendly webinar for employees planning to buy a home.', '2026-07-15 18:00:00', 'Online', 'https://example.com/webinar', 0, 1),
(1, 'Lunch & Learn: Mortgage Basics', 'A short session covering pre-approval, budgeting, and mortgage options.', '2026-07-25 12:00:00', 'Online', 'https://example.com/lunch-learn', 0, 1),
(1, 'Ask a Realtor Live Q&A', 'Employees can ask questions about searching, offers, inspections, and negotiation.', '2026-08-05 18:30:00', 'Online', 'https://example.com/realtor-qa', 0, 1),
(1, 'Down Payment Planning Workshop', 'A practical workshop for savings targets and purchase timeline planning.', '2026-08-18 17:30:00', 'Online', 'https://example.com/down-payment', 0, 1);

INSERT INTO pricing_plans
(title, price, description, features, button_text, button_link, display_order, sort_order)
VALUES
('Starter', 'Contact Us', 'Basic employer benefit program setup.', 'Branded employer page, Employee signup, Resource access, Single partnership setup', 'Contact', '/contact', 1, 1),
('Growth', 'Contact Us', 'Expanded content and employee engagement tools.', 'Everything in Starter, Team members, Quizzes, Events, HBT dashboard', 'Contact', '/contact', 2, 2),
('Premium', 'Contact Us', 'Full portal experience for advanced teams.', 'Everything in Growth, Custom content, Advanced follow-up, Priority support', 'Contact', '/contact', 3, 3);

INSERT INTO faqs
(question, answer, page_slug, display_order, sort_order)
VALUES
('Who uses this portal?', 'Employees use it to access home-buying benefits, resources, quizzes, events, and support.', 'home', 1, 1),
('Does the employer log in?', 'No. Employers only have a branded public entry page. Admins, HBT admins, and employees log in.', 'home', 2, 2),
('What is a partnership?', 'A partnership connects one employer to one home buying team using a unique slug.', 'home', 3, 3),
('What does an employee see?', 'Employees see employer branding, team content, resources, quizzes, events, and booking links.', 'home', 4, 4),
('Can each employer page look different?', 'Yes. Each employer can have its own logo, colours, public slug, and portal branding.', 'home', 5, 5);

INSERT INTO quizzes
(team_id, title, description, is_global)
VALUES
(NULL, 'Home Buying Readiness Quiz', 'A short quiz to help employees understand how ready they are to buy a home.', 1);

INSERT INTO quiz_questions
(quiz_id, question_text, question_type, display_order, sort_order)
VALUES
(1, 'Have you checked your credit score in the last 6 months?', 'true_false', 1, 1),
(1, 'What is usually needed before shopping for a home?', 'multiple_choice', 2, 2),
(1, 'Which item is usually part of closing costs?', 'multiple_choice', 3, 3),
(1, 'Do you already have a monthly housing budget?', 'true_false', 4, 4);

INSERT INTO quiz_options
(question_id, option_text, is_correct, display_order, sort_order)
VALUES
(1, 'True', 1, 1, 1),
(1, 'False', 0, 2, 2),
(2, 'Mortgage pre-approval', 1, 1, 1),
(2, 'Random house visits only', 0, 2, 2),
(2, 'Ignoring budget', 0, 3, 3),
(3, 'Legal fees', 1, 1, 1),
(3, 'A vacation fund only', 0, 2, 2),
(3, 'New video games', 0, 3, 3),
(4, 'True', 1, 1, 1),
(4, 'False', 0, 2, 2);

-- =========================================================
-- Login users are intentionally NOT inserted here.
-- Use backend seed scripts to create bcrypt passwords:
--
-- cd backend
-- node src/seed/createAdminUser.js
-- node src/seed/createHBTUser.js
-- node src/seed/createEmployeeUser.js
--
-- Internal QA logins after seed:
-- admin@test.com / admin123
-- hbt@test.com / hbt123
-- employee@test.com / employee123
-- =========================================================

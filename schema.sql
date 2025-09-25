-- Create chapters table
CREATE TABLE chapters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create topics table
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, chapter_id)
);

-- Create questions table
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- e.g., [{'option': 'A', 'value': '...'}, ...]
  correct_option TEXT NOT NULL,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  youtube_link TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exams table
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exam_questions join table
CREATE TABLE exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE
);

-- Create students table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_exams table to track exam attempts
CREATE TABLE student_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  score INTEGER,
  time_taken_seconds INTEGER,
  submitted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_answers table
CREATE TABLE student_answers (
  id SERIAL PRIMARY KEY,
  student_exam_id UUID REFERENCES student_exams(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL
);

-- Enable Row Level Security
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Policies for public access (students)
CREATE POLICY "Public read access for chapters" ON chapters FOR SELECT USING (true);
CREATE POLICY "Public read access for topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read access for questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Public read access for exams" ON exams FOR SELECT USING (true);
CREATE POLICY "Public read access for exam_questions" ON exam_questions FOR SELECT USING (true);

CREATE POLICY "Allow public insert for students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for student_exams" ON student_exams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert for student_answers" ON student_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow student to update their own exam" ON student_exams FOR UPDATE USING (true); -- Simplified for this example

-- Policies for admin access (assuming you have a way to identify admins, e.g., via a custom claim)
-- This requires a function to check for admin role. For simplicity, we'll allow all authenticated users to be admins.
CREATE POLICY "Allow full access for authenticated users" ON chapters FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access for authenticated users" ON topics FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access for authenticated users" ON questions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access for authenticated users" ON exams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow full access for authenticated users" ON exam_questions FOR ALL USING (auth.role() = 'authenticated');

-- Setup Storage for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question_images', 'question_images', true);
CREATE POLICY "Allow public read access to images" ON storage.objects FOR SELECT USING (bucket_id = 'question_images');
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'question_images' AND auth.role() = 'authenticated');

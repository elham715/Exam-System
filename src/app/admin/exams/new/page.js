'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function NewExamPage() {

  const router = useRouter();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [questionSets, setQuestionSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchQuestionSets = async () => {
      const { data, error } = await supabase.from('question_sets').select('id, name');
      if (data) setQuestionSets(data);
    };
    fetchQuestionSets();
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSet) {
        setFeedback('Please select a question set.');
        return;
    }

    // 1. Get all question IDs from the selected set
    const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('question_set_id', selectedSet);

    if (questionsError || questions.length === 0) {
        setFeedback('Could not find questions for this set, or the set is empty.');
        return;
    }

    // 2. Create the exam
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .insert({ title, duration_minutes: duration })
      .select('id')
      .single();

    if (examError) {
      setFeedback(`Error creating exam: ${examError.message}`);
      return;
    }

    // 3. Link questions to the exam
    const examId = examData.id;
    const examQuestionsData = questions.map(q => ({ exam_id: examId, question_id: q.id }));

    const { error: examQuestionsError } = await supabase.from('exam_questions').insert(examQuestionsData);

    if (examQuestionsError) {
      setFeedback(`Error linking questions: ${examQuestionsError.message}`);
    } else {
      setFeedback('Exam created successfully!');
      router.push(`/admin/exams`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-800 p-8 text-white">
      <h1 className="text-4xl font-bold mb-8">Create New Exam</h1>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto bg-neutral-900 p-8 rounded-lg">
        <div>
          <label htmlFor="title" className="block mb-2 font-semibold">Exam Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 bg-neutral-700 rounded-md"
            placeholder="e.g., Final Exam Practice"
            required
          />
        </div>
        <div>
          <label htmlFor="duration" className="block mb-2 font-semibold">Duration (minutes)</label>
          <input
            id="duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full p-2 bg-neutral-700 rounded-md"
            required
          />
        </div>

        <div>
          <label htmlFor="question-set" className="block mb-2 font-semibold">Select Question Set</label>
          <select
            id="question-set"
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value)}
            className="w-full p-2 bg-neutral-700 rounded-md"
            required
          >
            <option value="">Choose a set...</option>
            {questionSets.map(set => (
              <option key={set.id} value={set.id}>{set.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="w-full px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition">
          Generate Exam
        </button>
        {feedback && <p className="mt-4 text-center text-red-500">{feedback}</p>}
      </form>
    </div>
  );
}

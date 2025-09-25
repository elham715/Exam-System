'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export default function ResultsPage() {
  const supabase = createClient();
  const { id: studentExamId } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const { data, error } = await supabase
        .from('student_exams')
        .select(`
          score,
          time_taken_seconds,
          exam:exams(title),
          student:students(name),
          student_answers(
            selected_option,
            is_correct,
            question:questions(
              question_text,
              options,
              correct_option,
              youtube_link,
              image_url,
              topic:topics(name, youtube_link)
            )
          )
        `)
        .eq('id', studentExamId)
        .single();

      if (error) {
        console.error('Error fetching results:', error);
        setResults(null); // Ensure results is null on error
      } else if (data) {
        setResults(data);
      }
      setLoading(false);
    };

    if (studentExamId) fetchResults();
  }, [studentExamId, supabase]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-neutral-800 text-white text-xl">Loading results...</div>;
  if (!results) return <div className="min-h-screen flex items-center justify-center bg-neutral-800 text-primary text-xl">Could not find results or an error occurred.</div>;

  const mistakenAnswers = results.student_answers.filter(a => !a.is_correct && a.question);

  // Group mistaken answers by topic
  const mistakenTopicsGrouped = mistakenAnswers.reduce((acc, answer) => {
    const topicName = answer.question?.topic?.name || 'No Topic';
    if (!acc[topicName]) {
      acc[topicName] = { 
        topicVideoLink: answer.question?.topic?.youtube_link || null,
        questions: [] 
      };
    }
    acc[topicName].questions.push(answer);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-neutral-800 p-8 text-white animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold">Exam Results</h1>
          <p className="text-2xl text-neutral-300 mt-2">{results.exam.title}</p>
          <p className="text-xl text-neutral-400 mt-1">Student: {results.student.name}</p>
        </header>

        <div className="grid md:grid-cols-3 gap-8 mb-12 text-center">
          <div className="bg-neutral-900 p-6 rounded-lg shadow-xl">
            <p className="text-lg text-neutral-400">Your Score</p>
            <p className="text-4xl font-bold text-secondary">{results.score}%</p>
          </div>
          <div className="bg-neutral-900 p-6 rounded-lg shadow-xl">
            <p className="text-lg text-neutral-400">Time Taken</p>
            <p className="text-4xl font-bold">{Math.floor(results.time_taken_seconds / 60)}m {results.time_taken_seconds % 60}s</p>
          </div>
          <div className="bg-neutral-900 p-6 rounded-lg shadow-xl">
            <p className="text-lg text-neutral-400">Mistakes</p>
            <p className="text-4xl font-bold">{mistakenAnswers.length}</p>
          </div>
        </div>

        {Object.keys(mistakenTopicsGrouped).length > 0 && (
            <div className="mt-12">
                <h2 className="text-3xl font-bold mb-6">Review Mistaken Topics</h2>
                <div className="space-y-8">
                    {Object.entries(mistakenTopicsGrouped).map(([topicName, topicData]) => (
                        <div key={topicName} className="bg-neutral-900 p-6 rounded-lg shadow-xl">
                            <h3 className="text-2xl font-bold text-secondary mb-4 border-b border-neutral-700 pb-2">Topic: {topicName}</h3>
                            
                            {topicData.topicVideoLink && (
                                <div className="mb-6">
                                    <Link href={topicData.topicVideoLink} target="_blank">
                                        <span className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition">
                                            Watch Topic Review Video
                                        </span>
                                    </Link>
                                </div>
                            )}

                            <div className="space-y-6">
                                {topicData.questions.map((answer, index) => (
                                    <div key={answer.question.id} className="bg-neutral-800 p-4 rounded-lg shadow-md">
                                        <p className="text-lg mb-3"><span className="font-bold mr-2">{index + 1}.</span><BlockMath>{answer.question.question_text}</BlockMath></p>
                                        {answer.question.image_url && <img src={answer.question.image_url} alt="Question Image" className="max-w-xs max-h-32 object-contain rounded-md mt-2 mb-4 mx-auto"/>}
                                        <div className="p-3 rounded-md bg-red-800 text-white mb-2">
                                            Your Answer: <span className="font-semibold">{answer.selected_option}</span>
                                        </div>
                                        <div className="p-3 rounded-md bg-green-800 text-white mb-4">
                                            Correct Answer: <span className="font-semibold">{answer.question.correct_option}</span>
                                        </div>
                                        
                                        {answer.question.youtube_link && (
                                            <Link href={answer.question.youtube_link} target="_blank">
                                                <span className="inline-block px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-blue-600 transition">
                                                    Watch Question Solution
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {mistakenAnswers.length === 0 && (
            <div className="mt-12 text-center text-neutral-400">
                <p className="text-xl">Great job! You answered all questions correctly in this exam.</p>
            </div>
        )}

      </div>
    </div>
  );
}
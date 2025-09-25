'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { BlockMath } from 'react-katex';
import Link from 'next/link';

export default function ExamPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id: examId } = useParams();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: selectedOptionValue }
  
  // Exam-level timer states
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Student entry form state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentExamId, setStudentExamId] = useState(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [error, setError] = useState('');

  const fetchExamData = useCallback(async () => {
    if (!examId) return;

    console.log('Fetching exam data for examId:', examId);

    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('id, title, duration_minutes')
      .eq('id', examId)
      .single();

    if (examError) {
      console.error(`Failed to load exam: ${examError.message}`);
      setError(`Failed to load exam: ${examError.message}`);
      return;
    }
    console.log('Exam data fetched:', examData);
    setExam(examData);
    setTimeLeft(examData.duration_minutes * 60); // Convert minutes to seconds

    const { data: examQuestionsData, error: eqError } = await supabase
      .from('exam_questions')
      .select('question:questions(*)') // Fetch related question details
      .eq('exam_id', examId);

    if (eqError) {
      console.error(`Failed to load questions: ${eqError.message}`);
      setError(`Failed to load questions: ${eqError.message}`);
      return;
    }
    // Shuffle questions in JavaScript after fetching
    const shuffledQuestions = examQuestionsData.map(eq => eq.question).sort(() => Math.random() - 0.5);
    console.log('Questions data fetched and shuffled:', shuffledQuestions);
    setQuestions(shuffledQuestions);
  }, [examId, supabase]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  const handleSubmitExam = useCallback(async () => {
    clearInterval(timerRef.current);
    timerRef.current = null; // Clear ref
    setError('');

    if (!studentExamId) {
      setError('Exam not started or invalid state.');
      return;
    }

    let score = 0;
    const answersToInsert = [];

    for (const question of questions) {
      const selectedOption = selectedAnswers[question.id];
      const isCorrect = selectedOption === question.correct_option;
      if (isCorrect) score++;

      answersToInsert.push({
        student_exam_id: studentExamId,
        question_id: question.id,
        selected_option: selectedOption || '' , // Store empty string if not answered
        is_correct: isCorrect,
      });
    }

    // Calculate percentage score
    const percentageScore = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const timeTakenSeconds = exam.duration_minutes * 60 - timeLeft; // Time taken is total duration minus remaining

    // 1. Insert all student answers
    const { error: answersError } = await supabase.from('student_answers').insert(answersToInsert);
    if (answersError) {
      setError(`Error saving answers: ${answersError.message}`);
      return;
    }

    // 2. Update student_exam record with score and total time taken
    const { error: updateError } = await supabase
      .from('student_exams')
      .update({ score: percentageScore, time_taken_seconds: timeTakenSeconds, submitted_at: new Date().toISOString() })
      .eq('id', studentExamId);

    if (updateError) {
      setError(`Error updating exam results: ${updateError.message}`);
      return;
    }

    router.push(`/results/${studentExamId}`);
  }, [exam, questions, router, selectedAnswers, studentExamId, supabase, timeLeft]);

  // Exam-level timer logic
  useEffect(() => {
    if (isExamStarted && timeLeft > 0 && !timerRef.current) { 
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isExamStarted) { // Auto-submit if time runs out
      clearInterval(timerRef.current);
      timerRef.current = null;
      handleSubmitExam();
    } else if (!isExamStarted && timerRef.current) { // Clear if exam stops
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isExamStarted, timeLeft, handleSubmitExam]);

  const handleStartExam = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Upsert student
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .upsert({ name: studentName, email: studentEmail }, { onConflict: 'email' })
      .select('id')
      .single();

    if (studentError) {
      setError(`Error registering student: ${studentError.message}`);
      return;
    }

    // 2. Create student_exam record
    const { data: studentExamData, error: studentExamError } = await supabase
      .from('student_exams')
      .insert({ student_id: studentData.id, exam_id: examId, started_at: new Date().toISOString() })
      .select('id')
      .single();

    if (studentExamError) {
      setError(`Error starting exam: ${studentExamError.message}`);
      return;
    }

    setStudentExamId(studentExamData.id);
    setIsExamStarted(true);
  };

  const handleAnswerSelect = (questionId, selectedOptionValue) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: selectedOptionValue }));
  };

  if (error) return <div className="min-h-screen flex items-center justify-center bg-neutral-800 text-primary text-xl">Error: {error}</div>;
  if (!exam || questions.length === 0) return <div className="min-h-screen flex items-center justify-center bg-neutral-800 text-white text-xl">Loading exam...</div>;

  const currentQuestion = questions[currentQuestionIndex];

  if (!isExamStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-800">
        <form onSubmit={handleStartExam} className="w-full max-w-sm bg-neutral-900 p-8 rounded-lg shadow-xl animate-fade-in">
          <h2 className="text-2xl font-bold text-center text-white mb-6">Start Exam: {exam.title}</h2>
          <p className="text-neutral-300 text-center mb-4">Duration: {exam.duration_minutes} minutes for the entire exam</p>
          <input type="text" placeholder="Your Name" value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full p-2 mb-4 bg-neutral-700 rounded-md text-white" required />
          <input type="email" placeholder="Your Email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} className="w-full p-2 mb-4 bg-neutral-700 rounded-md text-white" required />
          <button type="submit" className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition">Start Exam</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-800 p-4 md:p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-neutral-400 mb-4">Omnia Learn</h3>
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">{exam.title}</h1>
          <div className="text-xl md:text-2xl font-mono bg-primary px-4 py-2 rounded-lg">
            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="bg-neutral-900 p-4 md:p-8 rounded-lg shadow-2xl">
          <div className="mb-6">
            <p className="text-md md:text-lg text-neutral-400 mb-4">Question {currentQuestionIndex + 1} of {questions.length}</p>
            <div className="text-lg md:text-xl"><BlockMath>{currentQuestion.question_text}</BlockMath></div>
            {currentQuestion.image_url && <img src={currentQuestion.image_url} alt="Question Image" className="max-w-full max-h-64 object-contain rounded-md mt-4 mx-auto"/>}
          </div>

          <div className="space-y-3 md:space-y-4">
            {currentQuestion.options.map((optionObj, i) => (
              <div key={i} onClick={() => handleAnswerSelect(currentQuestion.id, optionObj.value)} className={`p-3 md:p-4 rounded-lg cursor-pointer transition ${selectedAnswers[currentQuestion.id] === optionObj.value ? 'bg-secondary' : 'bg-neutral-700 hover:bg-neutral-600'}`}>
                {optionObj.value}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-6 md:mt-8">
            <button 
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 md:px-6 md:py-2 bg-neutral-700 rounded-lg disabled:opacity-50 hover:bg-neutral-600 transition text-sm md:text-base"
            >
                Previous
            </button>
            {currentQuestionIndex < questions.length - 1 ? (
                <button 
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-4 py-2 md:px-6 md:py-2 bg-secondary rounded-lg hover:bg-blue-600 transition"
                >
                    Next
                </button>
            ) : (
                <button 
                    onClick={handleSubmitExam}
                    className="px-4 py-2 md:px-6 md:py-2 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition"
                >
                    Submit Exam
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
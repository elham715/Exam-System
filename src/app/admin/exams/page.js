'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ManageExamsPage() {

  const [exams, setExams] = useState([]);
  const [copiedLink, setCopiedLink] = useState('');

  useEffect(() => {
    const fetchExams = async () => {
      const { data, error } = await supabase.from('exams').select('id, title, created_at').order('created_at', { ascending: false });
      if (data) {
        setExams(data);
      }
    };
    fetchExams();
  }, [supabase]);

  const getExamLink = (id) => {
    return `${window.location.origin}/exam/${id}`;
  };

  const handleCopyLink = (id) => {
    const link = getExamLink(id);
    navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(id);
        setTimeout(() => setCopiedLink(''), 2000); // Reset after 2 seconds
    });
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;

    const { error } = await supabase.from('exams').delete().eq('id', examId);

    if (error) {
      alert(`Error deleting exam: ${error.message}`);
    } else {
      setExams(exams.filter(exam => exam.id !== examId));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-800 p-8 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Manage Exams</h1>
            <Link href="/admin/exams/new">
                <span className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition">+ Create New Exam</span>
            </Link>
        </div>
        
        <div className="bg-neutral-900 rounded-lg shadow-xl">
            <div className="divide-y divide-neutral-700">
                {exams.length > 0 ? exams.map(exam => (
                    <div key={exam.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{exam.title}</h2>
                            <p className="text-neutral-400 text-sm mt-1">Created: {new Date(exam.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <input 
                                type="text" 
                                readOnly 
                                value={getExamLink(exam.id)}
                                className="p-2 bg-neutral-700 rounded-md w-full md:w-auto text-neutral-300"
                            />
                            <button 
                                onClick={() => handleCopyLink(exam.id)}
                                className="px-4 py-2 bg-secondary rounded-md hover:bg-blue-600 transition whitespace-nowrap"
                            >
                                {copiedLink === exam.id ? 'Copied!' : 'Copy Link'}
                            </button>
                            <button 
                                onClick={() => handleDeleteExam(exam.id)}
                                className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition whitespace-nowrap"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="p-8 text-center text-neutral-400">
                        <p>No exams found. <Link href="/admin/exams/new" className="text-secondary hover:underline">Create one now</Link>.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

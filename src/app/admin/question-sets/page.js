'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ManageQuestionSetsPage() {

  const router = useRouter();
  const [questionSets, setQuestionSets] = useState([]);
  const [newSetName, setNewSetName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestionSets = async () => {
      const { data, error } = await supabase.from('question_sets').select('id, name, created_at').order('created_at', { ascending: false });
      if (data) {
        setQuestionSets(data);
      }
    };
    fetchQuestionSets();
  }, [supabase]);

  const handleCreateSet = async (e) => {
    e.preventDefault();
    if (!newSetName) return;

    const { data, error } = await supabase.from('question_sets').insert({ name: newSetName }).select('id').single();

    if (error) {
      setError(error.message);
    } else {
      router.push(`/admin/question-sets/${data.id}`);
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!confirm('Are you sure you want to delete this question set? This will also delete all questions within it.')) return;

    const { error } = await supabase.from('question_sets').delete().eq('id', setId);

    if (error) {
      setError(`Error deleting set: ${error.message}`);
    } else {
      setQuestionSets(questionSets.filter(set => set.id !== setId));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-800 p-8 text-white">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Manage Question Sets</h1>

        <form onSubmit={handleCreateSet} className="mb-12 bg-neutral-900 p-6 rounded-lg shadow-lg flex gap-4">
          <input 
            type="text"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="Enter name for new question set..."
            className="flex-grow p-3 bg-neutral-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button type="submit" className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition">+ Create New Set</button>
        </form>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-neutral-900 rounded-lg shadow-xl">
            <div className="divide-y divide-neutral-700">
                {questionSets.length > 0 ? questionSets.map(set => (
                    <div key={set.id} className="flex items-center justify-between">
                        <Link href={`/admin/question-sets/${set.id}`} className="flex-grow">
                            <div className="p-6 hover:bg-neutral-800 cursor-pointer transition">
                                <h2 className="text-2xl font-bold text-white">{set.name}</h2>
                                <p className="text-neutral-400 text-sm mt-1">Created: {new Date(set.created_at).toLocaleString()}</p>
                            </div>
                        </Link>
                        <button 
                            onClick={(e) => {
                                e.preventDefault(); // Prevent Link navigation
                                e.stopPropagation(); // Prevent Link navigation
                                handleDeleteSet(set.id);
                            }}
                            className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition mr-6"
                        >
                            Delete
                        </button>
                    </div>
                )) : (
                    <div className="p-8 text-center text-neutral-400">
                        <p>No question sets found. Create one above to get started.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

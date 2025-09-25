'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { BlockMath } from 'react-katex';
import Link from 'next/link';

export default function EditQuestionSetPage() {
  const supabase = createClient();
  const { id: questionSetId } = useParams();

  const [questionSet, setQuestionSet] = useState(null);
  const [questionsInSet, setQuestionsInSet] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form state for new question
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([{ value: '', isCorrect: false }]);
  const [questionYoutubeLink, setQuestionYoutubeLink] = useState('');
  const [questionImageUrl, setQuestionImageUrl] = useState(''); // For direct image link
  const [imageFile, setImageFile] = useState(null); // For file upload
  const [uploadingImage, setUploadingImage] = useState(false);

  // Chapter and Topic State
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [newChapterName, setNewChapterName] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [topicYoutubeLink, setTopicYoutubeLink] = useState(''); // For new topic
  const [currentTopicYoutubeLink, setCurrentTopicYoutubeLink] = useState(''); // For existing topic

  const fetchChapters = useCallback(async () => {
    const { data } = await supabase.from('chapters').select('id, name').order('name');
    if (data) setChapters(data);
  }, [supabase]);

  const fetchTopics = useCallback(async (chapterId) => {
    if (!chapterId) {
      setTopics([]);
      setSelectedTopic('');
      setCurrentTopicYoutubeLink('');
      return;
    }
    const { data } = await supabase.from('topics').select('id, name, youtube_link').eq('chapter_id', chapterId).order('name');
    if (data) setTopics(data);
  }, [supabase]);

  const fetchQuestionSetDetails = useCallback(async () => {
    if (!questionSetId) return;

    const { data: setData } = await supabase.from('question_sets').select('name').eq('id', questionSetId).single();
    if (setData) setQuestionSet(setData);

    const { data: questionsData } = await supabase.from('questions').select('id, question_text, youtube_link, image_url').eq('question_set_id', questionSetId).order('created_at');
    if (questionsData) setQuestionsInSet(questionsData);
  }, [questionSetId, supabase]);

  useEffect(() => {
    fetchChapters();
    fetchQuestionSetDetails();
  }, [fetchChapters, fetchQuestionSetDetails]);

  useEffect(() => {
    fetchTopics(selectedChapter);
  }, [selectedChapter, fetchTopics]);

  useEffect(() => {
    if (selectedTopic) {
      const topic = topics.find(t => t.id === parseInt(selectedTopic));
      setCurrentTopicYoutubeLink(topic ? topic.youtube_link || '' : '');
    } else {
      setCurrentTopicYoutubeLink('');
    }
  }, [selectedTopic, topics]);

  const handleAddOption = () => setOptions([...options, { value: '', isCorrect: false }]);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].value = value;
    setOptions(newOptions);
  };

  const handleCorrectOptionChange = (index) => {
    const newOptions = options.map((option, i) => ({ ...option, isCorrect: i === index }));
    setOptions(newOptions);
  };

  const resetForm = () => {
    setQuestionText('');
    setOptions([{ value: '', isCorrect: false }]);
    setQuestionYoutubeLink('');
    setQuestionImageUrl('');
    setImageFile(null);
  };

  const handleImageUpload = async () => {
    if (!imageFile) return null;

    setUploadingImage(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${questionSetId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('question_images')
      .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

    setUploadingImage(false);

    if (uploadError) {
      setFeedback({ type: 'error', message: `Image upload error: ${uploadError.message}` });
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('question_images').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    let chapterId = selectedChapter;

    // 1. Create new chapter if needed
    if (newChapterName) {
        const { data, error } = await supabase.from('chapters').insert({ name: newChapterName }).select('id').single();
        if (error) {
            setFeedback({ type: 'error', message: `Error creating chapter: ${error.message}` });
            return;
        }
        chapterId = data.id;
        fetchChapters(); // Re-fetch chapters to update dropdown
        setSelectedChapter(data.id);
        setNewChapterName('');
    } else if (!chapterId) {
        setFeedback({ type: 'error', message: 'Please select or create a chapter.' });
        return;
    }

    let topicId = selectedTopic;

    // 2. Create new topic if needed
    if (newTopicName) {
        const { data, error } = await supabase
            .from('topics')
            .insert({ name: newTopicName, chapter_id: chapterId, youtube_link: topicYoutubeLink || null })
            .select('id')
            .single();
        
        if (error) {
            setFeedback({ type: 'error', message: `Error creating topic: ${error.message}` });
            return;
        }
        topicId = data.id;
        fetchTopics(chapterId); // Re-fetch topics to update dropdown
        setSelectedTopic(data.id);
        setNewTopicName('');
        setTopicYoutubeLink('');
    } else if (!topicId) {
        setFeedback({ type: 'error', message: 'Please select or create a topic.' });
        return;
    }

    // 3. Update existing topic's YouTube link if changed
    if (selectedTopic && currentTopicYoutubeLink !== topics.find(t => t.id === parseInt(selectedTopic))?.youtube_link) {
      const { error } = await supabase.from('topics').update({ youtube_link: currentTopicYoutubeLink || null }).eq('id', selectedTopic);
      if (error) {
        setFeedback({ type: 'error', message: `Error updating topic video: ${error.message}` });
        return;
      }
    }

    const correctOption = options.find(opt => opt.isCorrect)?.value;
    if (!correctOption || !questionText) {
        setFeedback({ type: 'error', message: 'Please provide a question and mark one option as correct.' });
        return;
    }

    let finalImageUrl = questionImageUrl;
    if (imageFile) {
      finalImageUrl = await handleImageUpload();
      if (!finalImageUrl) return; // Stop if image upload failed
    }

    // 4. Create the question
    const { data, error } = await supabase.from('questions').insert({
        question_text: questionText,
        options: options.map(o => ({ value: o.value })),
        correct_option: correctOption,
        question_set_id: questionSetId,
        chapter_id: chapterId,
        topic_id: topicId,
        youtube_link: questionYoutubeLink || null,
        image_url: finalImageUrl || null,
    }).select('id, question_text, youtube_link, image_url').single();

    if (error) {
        setFeedback({ type: 'error', message: `Error creating question: ${error.message}` });
    } else {
        setFeedback({ type: 'success', message: 'Question added successfully!' });
        setQuestionsInSet(prev => [...prev, data]);
        resetForm();
    }
  };

  if (!questionSet) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-800 p-8 text-white">
        <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Editing Question Set: <span className="text-secondary">{questionSet.name}</span></h1>
            <p className="text-neutral-300 mb-8">Add questions to your set below. They are saved automatically as you add them.</p>

            <form onSubmit={handleAddQuestion} className="space-y-6 bg-neutral-900 p-8 rounded-lg mb-12 shadow-lg">
                <h2 className="text-2xl font-bold">Add a New Question</h2>
                
                {/* Chapter and Topic Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block mb-2 font-semibold">Chapter</label>
                        <select 
                            value={selectedChapter} 
                            onChange={e => { setSelectedChapter(e.target.value); setNewChapterName(''); }}
                            className="w-full p-2 bg-neutral-700 rounded-md"
                            disabled={!!newChapterName}
                        >
                            <option value="">Select Chapter</option>
                            {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input 
                            type="text"
                            placeholder="Or create a new chapter..."
                            value={newChapterName}
                            onChange={e => { setNewChapterName(e.target.value); setSelectedChapter(''); }}
                            className="w-full p-2 mt-2 bg-neutral-700 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block mb-2 font-semibold">Topic</label>
                        <select 
                            value={selectedTopic} 
                            onChange={e => { setSelectedTopic(e.target.value); setNewTopicName(''); setTopicYoutubeLink(''); }}
                            className="w-full p-2 bg-neutral-700 rounded-md"
                            disabled={!selectedChapter || !!newTopicName}
                        >
                            <option value="">Select Topic</option>
                            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input 
                            type="text"
                            placeholder="Or create a new topic..."
                            value={newTopicName}
                            onChange={e => { setNewTopicName(e.target.value); setSelectedTopic(''); setCurrentTopicYoutubeLink(''); }}
                            className="w-full p-2 mt-2 bg-neutral-700 rounded-md"
                            disabled={!selectedChapter}
                        />
                    </div>
                </div>

                {/* Topic YouTube Link (for new or existing topic) */}
                {(newTopicName || selectedTopic) && (
                    <div>
                        <label className="block mb-2 font-semibold">Topic Video (Optional)</label>
                        <input 
                            type="url"
                            value={newTopicName ? topicYoutubeLink : currentTopicYoutubeLink}
                            onChange={e => newTopicName ? setTopicYoutubeLink(e.target.value) : setCurrentTopicYoutubeLink(e.target.value)}
                            className="w-full p-2 bg-neutral-700 rounded-md"
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                        {selectedTopic && currentTopicYoutubeLink && !newTopicName && (
                            <a href={currentTopicYoutubeLink} target="_blank" rel="noopener noreferrer" className="text-sm text-secondary hover:underline mt-1 inline-block">View Current Topic Video</a>
                        )}
                    </div>
                )}

                {/* Question Input */}
                <div>
                    <label className="block mb-2 font-semibold">Question (supports LaTeX)</label>
                    <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full p-2 bg-neutral-700 rounded-md" rows="4" placeholder="e.g. What is $$2+2=?$$"></textarea>
                    <div className="mt-2 p-4 bg-neutral-800 rounded-md min-h-[50px]">
                        <h3 className="font-semibold mb-2 text-sm">Preview:</h3>
                        <BlockMath>{questionText || ''}</BlockMath>
                    </div>
                </div>
                
                {/* Options Input */}
                <div>
                    <h3 className="font-semibold mb-4">Options (Mark the correct one)</h3>
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-4 mb-4">
                            <input type="radio" name="correctOption" checked={option.isCorrect} onChange={() => handleCorrectOptionChange(index)} className="form-radio h-5 w-5 text-secondary bg-neutral-700 border-neutral-600 focus:ring-secondary shrink-0"/>
                            <input type="text" value={option.value} onChange={(e) => handleOptionChange(index, e.target.value)} className="flex-grow p-2 bg-neutral-700 rounded-md" placeholder={`Option ${index + 1}`}/>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddOption} className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 transition text-sm">Add Option</button>
                </div>

                {/* Question Solve Video */}
                <div>
                    <label className="block mb-2 font-semibold">Question Solve Video (Optional)</label>
                    <input 
                        type="url"
                        value={questionYoutubeLink}
                        onChange={e => setQuestionYoutubeLink(e.target.value)}
                        className="w-full p-2 bg-neutral-700 rounded-md"
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                </div>

                {/* Question Image */}
                <div>
                    <label className="block mb-2 font-semibold">Question Image (Optional)</label>
                    <input 
                        type="url"
                        value={questionImageUrl}
                        onChange={e => { setQuestionImageUrl(e.target.value); setImageFile(null); }}
                        className="w-full p-2 bg-neutral-700 rounded-md mb-2"
                        placeholder="Or paste image URL here..."
                    />
                    <input 
                        type="file"
                        accept="image/*"
                        onChange={e => { setImageFile(e.target.files[0]); setQuestionImageUrl(''); }}
                        className="w-full p-2 bg-neutral-700 rounded-md"
                    />
                    {uploadingImage && <p className="text-neutral-400 mt-2">Uploading image...</p>}
                    {questionImageUrl && !imageFile && (
                        <div className="mt-2">
                            <img src={questionImageUrl} alt="Question Preview" className="max-w-xs h-auto rounded-md"/>
                            <p className="text-sm text-neutral-400">Image will be loaded from URL.</p>
                        </div>
                    )}
                    {imageFile && !questionImageUrl && (
                        <p className="text-sm text-neutral-400 mt-2">Image selected for upload: {imageFile.name}</p>
                    )}
                </div>

                <button type="submit" className="w-full px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition" disabled={uploadingImage}>
                    {uploadingImage ? 'Adding Question...' : '+ Add Question to Set'}
                </button>
                {feedback.message && <p className={`mt-4 text-center font-semibold ${feedback.type === 'error' ? 'text-primary' : 'text-green-400'}`}>{feedback.message}</p>}
            </form>

            {/* List of questions already in the set */}
            <div>
                <h2 className="text-3xl font-bold mb-6">Questions in this Set ({questionsInSet.length})</h2>
                <div className="space-y-4">
                    {questionsInSet.map((q, index) => (
                        <div key={q.id} className="bg-neutral-900 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow">
                            <div className="flex-grow">
                                <p className="text-lg"><span className="font-bold mr-4">{index + 1}.</span><BlockMath>{q.question_text}</BlockMath></p>
                                {q.image_url && <img src={q.image_url} alt="Question Image" className="max-w-xs h-auto rounded-md mt-2"/>}
                                {q.youtube_link && <a href={q.youtube_link} target="_blank" rel="noopener noreferrer" className="text-sm text-secondary hover:underline mt-2 inline-block">View Solve Video</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}

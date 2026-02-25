'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Mic, Square, Sparkles, Send,
    ChevronLeft, MessageSquare, Quote,
    Lightbulb, User, Users, Info, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInterview, addRecording, suggestQuestions, Interview, InterviewEntry } from '@/lib/api';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export default function InterviewDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [interview, setInterview] = useState<Interview | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [currentUser, setCurrentUser] = useState('');

    // Form states for the modal
    const [entryType, setEntryType] = useState<InterviewEntry['type']>('presentation');
    const [addresser, setAddresser] = useState('');
    const [addressee, setAddressee] = useState('');
    const [targetPerson, setTargetPerson] = useState<string>('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const user = localStorage.getItem('interview_user');
        if (!user) {
            router.push('/');
            return;
        }
        setCurrentUser(user);
        loadInterview();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id]);

    const loadInterview = async () => {
        try {
            const response = await getInterview(id as string);
            setInterview(response.data);
        } catch (error) {
            console.error('Failed to load interview', error);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                setIsRecording(false);
                setRecordingTime(0);
                if (timerRef.current) clearInterval(timerRef.current);
                setShowModal(true);
            };

            mediaRecorder.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording', error);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleProcessRecording = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('type', entryType);
        formData.append('addresser', addresser);
        formData.append('addressee', addressee);
        formData.append('interviewUser', currentUser);

        setIsSynthesizing(true);
        setShowModal(false);

        try {
            const response = await addRecording(id as string, formData);
            setInterview(response.data);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#1e40af', '#ffffff']
            });
        } catch (error) {
            console.error('Error uploading recording', error);
            alert('Failed to process recording');
        } finally {
            setIsSynthesizing(false);
            // Reset form
            setAddresser('');
            setAddressee('');
        }
    };

    const handleGenerateSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
            const response = await suggestQuestions(id as string, targetPerson || undefined, currentUser);
            setSuggestions(response.data.questions);
        } catch (error) {
            console.error('Error generating suggestions', error);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!interview) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-32">
            {/* Header */}
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/interviews')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span>Back to Sessions</span>
                    </button>
                    <h1 className="font-bold text-white line-clamp-1">{interview.title}</h1>
                    <div className="w-24" /> {/* Spacer */}
                </div>
            </nav>

            <main className="max-w-4xl mx-auto p-6 space-y-8">
                {/* Suggestion Section */}
                <section className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <h3 className="font-bold text-white italic">AI Strategic Insights</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <select
                                value={targetPerson}
                                onChange={(e) => setTargetPerson(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                            >
                                <option value="">General Context</option>
                                {Array.from(new Set(interview.entries.map(e => e.addresser).filter(Boolean))).map(person => (
                                    <option key={person} value={person}>Address {person}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleGenerateSuggestions}
                                disabled={isLoadingSuggestions || isSynthesizing || interview.entries.length === 0}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                            >
                                {isLoadingSuggestions ? 'Generating...' : 'Generate Questions'}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {suggestions.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-3 pt-2"
                            >
                                {suggestions.map((q, idx) => (
                                    <motion.div
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        key={idx}
                                        className="bg-blue-900/40 border border-blue-500/30 p-4 rounded-2xl flex gap-3"
                                    >
                                        <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0" />
                                        <p className="text-blue-100/90 text-sm leading-relaxed">{q}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {interview.entries.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4">
                            Add entries to enable AI-powered suggestion generation.
                        </p>
                    )}
                </section>

                {/* Entries Feed */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="uppercase text-xs font-bold tracking-widest">Synthesis Feed</span>
                    </div>

                    {isSynthesizing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center space-y-4"
                        >
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-blue-500 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <h4 className="font-bold text-white">Synthesizing Audio...</h4>
                                <p className="text-sm text-slate-500">Processing transcripts and generating OR insights.</p>
                            </div>
                        </motion.div>
                    )}

                    <div className="space-y-8">
                        {interview.entries.slice().reverse().map((entry, idx) => (
                            <EntryCard key={idx} entry={entry} />
                        ))}
                    </div>

                    {interview.entries.length === 0 && !isSynthesizing && (
                        <div className="text-center py-20 text-slate-600">
                            <Mic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No entries yet. Tap the microphone to start recording.</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Recording Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 p-6 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {isRecording ? (
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="font-mono text-xl text-white font-bold">{formatTime(recordingTime)}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-slate-500">
                                <Users className="w-5 h-5" />
                                <span className="text-sm font-medium">Ready to capture insights</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSynthesizing}
                        className={cn(
                            "p-6 rounded-full transition-all shadow-xl",
                            isRecording
                                ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                        )}
                    >
                        {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </button>

                    <div className="w-32" /> {/* Spacer */}
                </div>
            </div>

            {/* Context Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-2xl"
                        >
                            <h3 className="text-2xl font-bold text-white mb-6">Capture Context</h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['presentation', 'question_feedback', 'other'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setEntryType(t as any)}
                                                className={cn(
                                                    "px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all",
                                                    entryType === t
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                                                )}
                                            >
                                                {t.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Addresser (Who's speaking?)</label>
                                        <input
                                            value={addresser}
                                            onChange={e => setAddresser(e.target.value)}
                                            placeholder="e.g. Richard, Interviewer..."
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Addressee (To whom?)</label>
                                        <input
                                            value={addressee}
                                            onChange={e => setAddressee(e.target.value)}
                                            placeholder="e.g. Panel, Group..."
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleProcessRecording}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                                >
                                    <Send className="w-5 h-5" />
                                    Finalize & Synthesize
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function EntryCard({ entry }: { entry: InterviewEntry }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSynthesisExpanded, setIsSynthesisExpanded] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
        >
            <div className="p-6 space-y-6">
                {/* Entry Header */}
                <div
                    className="flex items-start justify-between cursor-pointer group"
                    onClick={() => setIsSynthesisExpanded(!isSynthesisExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 p-3 rounded-2xl text-blue-500 flex items-center justify-center font-bold">
                            {entry.type === 'presentation' ? 'P' : entry.type === 'question_feedback' ? 'Q' : 'O'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white capitalize group-hover:text-blue-400 transition-colors">{entry.addresser || 'Unknown'}</span>
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                                <span className="font-bold text-slate-400 capitalize">{entry.addressee || 'Everyone'}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                <span className="capitalize">{entry.type.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/5 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/10">
                            {entry.applicantName}
                        </div>
                        <div className={cn("text-slate-600 transition-transform duration-300", isSynthesisExpanded ? "rotate-180" : "")}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isSynthesisExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-6 overflow-hidden"
                        >
                            {/* Summary */}
                            <div className="space-y-4 pt-4 border-t border-slate-800/50">
                                <div className="flex items-start gap-3">
                                    <Quote className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                                    <div className="space-y-3 text-slate-300 leading-relaxed text-sm">
                                        {entry.summary.split('\n\n').map((p, i) => (
                                            <p key={i}>{p}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Highlights */}
                            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-blue-500" />
                                    Core Highlights
                                </h5>
                                <ul className="space-y-3">
                                    {entry.highlights.map((h, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-slate-400">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>{h}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Raw Text Toggle */}
                            <div className="pt-2 border-t border-slate-800">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    <Info className="w-3 h-3" />
                                    {isExpanded ? 'Hide Raw Transcript' : 'Show Raw Transcript'}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-4 p-4 bg-slate-950 rounded-xl"
                                        >
                                            <p className="text-xs text-slate-500 leading-normal italic line-height-1.5 whitespace-pre-wrap">
                                                {entry.rawText}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

function ArrowRight(props: any) {
    return (
        <svg
            {...props}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
    );
}

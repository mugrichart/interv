'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, History, Calendar, User as UserIcon, ArrowRight, LayoutDashboard, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getInterviews, createInterview, Interview, deleteInterview } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function InterviewsPage() {
    const router = useRouter();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = localStorage.getItem('interview_user');
        if (!user) {
            router.push('/');
            return;
        }
        setUserName(user);
        loadInterviews();
    }, [router]);

    const loadInterviews = async () => {
        try {
            const response = await getInterviews();
            setInterviews(response.data);
        } catch (error) {
            console.error('Failed to load interviews', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartNew = async () => {
        const title = `${userName}-interview-${new Date().toISOString().split('T')[0]}`;
        try {
            const response = await createInterview(title);
            router.push(`/interviews/${response.data.id}`);
        } catch (error) {
            console.error('Failed to create interview', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this interview?')) return;
        try {
            await deleteInterview(id);
            setInterviews(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error('Failed to delete interview', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Sidebar-ish Top Bar */}
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-white">
                        <LayoutDashboard className="text-blue-500" />
                        <span>Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-400">Welcome, {userName}</span>
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                            {userName[0]}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6 space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Interview Sessions</h2>
                        <p className="text-slate-400">Track and synthesize your group interview history.</p>
                    </div>
                </header>

                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-3xl bg-slate-900 animate-pulse border border-slate-800" />
                        ))}
                    </div>
                ) : interviews.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-6">
                        <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                            <History className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">No interviews found</h3>
                            <p className="text-slate-400 max-w-sm mx-auto">You haven't recorded any sessions yet. Start your first one to begin generating AI insights.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {interviews.map((interview) => (
                            <InterviewCard
                                key={interview.id}
                                interview={interview}
                                onClick={() => router.push(`/interviews/${interview.id}`)}
                                onDelete={(e) => handleDelete(e, interview.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="fixed bottom-8 right-8">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartNew}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-blue-900/20 transition-all border border-blue-400/50"
                    >
                        <Plus className="w-6 h-6" />
                        Start New Interview
                    </motion.button>
                </div>
            </main>
        </div>
    );
}

function InterviewCard({ interview, onClick, onDelete }: { interview: Interview; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="relative group h-full"
        >
            <div
                onClick={onClick}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-left hover:border-blue-500/50 transition-all space-y-4 cursor-pointer h-full"
            >
                <div className="flex items-center justify-between">
                    <div className="bg-blue-500/10 p-3 rounded-2xl group-hover:bg-blue-500/20 transition-colors text-blue-500">
                        <Calendar className="w-5 h-5" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1">{interview.title}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        {interview.entries.length} Entries
                    </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-slate-500 group-hover:text-blue-500 transition-colors">
                    <span className="text-xs font-semibold uppercase tracking-wider">Open Session</span>
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>

            <button
                onClick={onDelete}
                className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-slate-700 hover:border-red-500/50"
                title="Delete Interview"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    );
}

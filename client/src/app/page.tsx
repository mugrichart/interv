'use client';

import { useRouter } from 'next/navigation';
import { User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();

  const handleSelect = (user: string) => {
    localStorage.setItem('interview_user', user);
    router.push('/interviews');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Group Interview <span className="text-blue-500">Assistant</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto">
            Operational Research Scholarship MVP. Select your profile to begin transcription and AI-guided feedback.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <SelectionCard
            name="Daisy"
            role="Operational Researcher"
            icon={<User className="w-12 h-12 text-pink-400" />}
            onClick={() => handleSelect('Daisy')}
          />
          <SelectionCard
            name="Richard"
            role="Data Scientist"
            icon={<User className="w-12 h-12 text-blue-400" />}
            onClick={() => handleSelect('Richard')}
          />
        </div>
      </div>
    </div>
  );
}

function SelectionCard({ name, role, icon, onClick }: { name: string; role: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl hover:bg-slate-800 transition-all text-left space-y-4 group"
    >
      <div className="bg-slate-900 rounded-2xl p-4 w-fit group-hover:bg-slate-700 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white">{name}</h3>
        <p className="text-slate-400">{role}</p>
      </div>
      <div className="pt-4 flex items-center text-blue-500 font-semibold">
        Enter Dashboard <ShieldCheck className="w-5 h-5 ml-2" />
      </div>
    </motion.button>
  );
}

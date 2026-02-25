import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
    baseURL: API_URL,
});

export interface InterviewEntry {
    type: 'presentation' | 'question_feedback' | 'other';
    applicantName: string;
    rawText: string;
    summary: string;
    highlights: string[];
    addresser: string;
    addressee: string;
    timestamp: string;
}

export interface Interview {
    id: string;
    title: string;
    entries: InterviewEntry[];
}

export const getInterviews = () => api.get<Interview[]>('/interviews');
export const getInterview = (id: string) => api.get<Interview>(`/interviews/${id}`);
export const createInterview = (title: string) => api.post<Interview>('/interviews', { title });
export const addRecording = (interviewId: string, formData: FormData) =>
    api.post<Interview>(`/interviews/${interviewId}/record`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
export const deleteInterview = (id: string) => api.delete<{ success: boolean }>(`/interviews/${id}`);
export const suggestQuestions = (interviewId: string, targetPerson?: string, interviewUser?: string) =>
    api.post<{ questions: string[] }>(`/interviews/${interviewId}/suggest-questions`, { targetPerson, interviewUser });

'use client';

import { useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function KeepAlive() {
    useEffect(() => {
        // Ping every 5 minutes to keep Render instance awake
        const interval = setInterval(async () => {
            try {
                await axios.get(`${API_URL}/interviews`);
                console.log('Keep-alive ping successful');
            } catch (error) {
                console.error('Keep-alive ping failed', error);
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return null;
}

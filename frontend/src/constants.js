// src/constants.js

export const getBaseUrl = () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // If not local, ALWAYS force the production Render URL to avoid env var issues
    if (!isLocal) {
        return 'https://ironchords.onrender.com';
    }
    
    // In local dev, use the env var or default to 8000
    const raw = import.meta.env.VITE_API_BASE_URL;
    if (raw) return raw.replace(/\/$/, '');
    return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getBaseUrl().replace(/\/api\/?$/, '');
export const API_BASE = `${getBaseUrl()}/api`.replace(/\/+$/, '/api');

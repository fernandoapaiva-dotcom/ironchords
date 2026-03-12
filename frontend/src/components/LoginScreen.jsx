import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, Clock, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

// Google Client ID – set your own in VITE_GOOGLE_CLIENT_ID env var
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''; 

/** Normalize Gmail: remove dots + strip +alias (mirrors backend normalize_gmail) */
function normalizeGmail(email) {
    if (!email) return '';
    email = email.toLowerCase().trim();
    const [local, domain] = email.split('@');
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        const cleaned = local.split('+')[0].replace(/\./g, '');
        return `${cleaned}@gmail.com`;
    }
    return email;
}

/** Decode a Google JWT ID token without a library */
function decodeGoogleJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')));
    } catch { return null; }
}

const LoginScreen = ({ onAuthorized }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, pending, authorized, error
    const [message, setMessage] = useState('');
    const googleBtnRef = useRef(null);

    const getBaseUrl = () => {
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

    const API_BASE = `${getBaseUrl()}/api`.replace(/\/+$/, '/api');

    useEffect(() => {
        const savedEmail = localStorage.getItem('ironchords_user_email');
        if (savedEmail) {
            setEmail(savedEmail);
            checkStatus(savedEmail);
        }
    }, []);

    // Initialize Google Sign-In once the GSI script is available
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return; // No client ID configured - skip Google login

        const initGoogle = () => {
            if (!window.google?.accounts?.id) return;
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential,
                auto_select: false,
                cancel_on_tap_outside: true,
            });
            if (googleBtnRef.current) {
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'filled_black',
                    size: 'large',
                    shape: 'pill',
                    text: 'signin_with',
                    logo_alignment: 'left',
                    width: googleBtnRef.current.offsetWidth || 320,
                });
            }
        };

        if (window.google?.accounts?.id) {
            initGoogle();
        } else {
            // Load the GSI script dynamically
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initGoogle;
            document.head.appendChild(script);
            return () => { document.head.removeChild(script); };
        }
    }, [GOOGLE_CLIENT_ID, status]);

    const handleGoogleCredential = async (response) => {
        const payload = decodeGoogleJwt(response.credential);
        if (!payload?.email) {
            setStatus('error');
            setMessage('Não foi possível obter o e-mail da conta Google.');
            return;
        }
        const googleEmail = normalizeGmail(payload.email);
        setEmail(googleEmail);
        localStorage.setItem('ironchords_user_email', googleEmail);
        await checkStatus(googleEmail);
    };

    const checkStatus = async (emailToCheck) => {
        setStatus('loading');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        try {
            const res = await fetch(`${API_BASE}/auth/status/${emailToCheck}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            
            if (data.status === 'authorized') {
                setStatus('authorized');
                onAuthorized(emailToCheck);
            } else if (data.status === 'pending') {
                setStatus('pending');
                setMessage('Seu acesso está aguardando autorização do administrador.');
            } else {
                // Auto-register on first Google login
                await handleRegisterWithEmail(emailToCheck);
            }
        } catch (err) {
            console.error("Status check error details:", err);
            setStatus('error');
            const msg = err.name === 'AbortError' ? 'Servidor demorou muito a responder' : (err.message || 'Falha na rede');
            setMessage(`Erro ao conectar com o servidor em ${API_BASE}: ${msg}`);
        } finally {
            // Only clear loading if we are NOT authorized (onAuthorized already handles navigation/unmount)
            // But actually it's safer to clear it anyway if status isn't authorized or pending
        }
    };

    const handleRegisterWithEmail = async (emailToUse) => {
        setStatus('loading');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToUse }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.detail || `Erro ${res.status}`);

            if (data.status === 'authorized') {
                localStorage.setItem('ironchords_user_email', emailToUse);
                onAuthorized(emailToUse);
            } else if (data.status === 'pending') {
                setStatus('pending');
                setMessage('Acesso solicitado com sucesso! Aguarde autorização.');
            }
        } catch (err) {
            console.error("Registration error:", err);
            const msg = err.name === 'AbortError' ? 'Servidor demorou muito a responder' : (err.message || 'Erro de conexão');
            setStatus('error');
            setMessage(`Erro ao solicitar acesso: ${msg}`);
        }
    };



    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setMessage('Por favor, insira um e-mail válido.');
            return;
        }
        await handleRegisterWithEmail(email);
    };

    return (
        <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 font-sans selection:bg-[#ea580c]/30 selection:text-white">
            <div className="w-full max-w-md">
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#ea580c] to-[#B87333] rounded-[24px] flex items-center justify-center shadow-[0_0_50px_rgba(234,88,12,0.3)] mb-6 animate-in zoom-in duration-700">
                        <Flame className="w-10 h-10 text-white fill-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                        IRON<span className="text-[#ea580c]">CHORDS</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">Portal de Acesso Exclusivo</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#16161D] border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ea580c]/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    
                    {status === 'pending' ? (
                        <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Clock className="w-10 h-10 text-blue-500 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Acesso Pendente</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                            </div>
                            <div className="pt-4 space-y-4">
                                <button 
                                    onClick={() => checkStatus(email)}
                                    disabled={status === 'loading'}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 transition-all active:scale-[0.98] flex items-center justify-center space-x-3 group"
                                >
                                    <span>Verificar Status</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem('ironchords_user_email');
                                        setStatus('idle');
                                        setEmail('');
                                    }}
                                    className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    Usar outro e-mail
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Boas-vindas</h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Entre com sua conta Google ou e-mail</p>
                            </div>

                            {/* Google Sign-In Button */}
                            {GOOGLE_CLIENT_ID && (
                                <div className="space-y-3">
                                    <div 
                                        ref={googleBtnRef} 
                                        className="w-full flex justify-center" 
                                        style={{ minHeight: 44 }}
                                    />
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-white/10" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">ou</span>
                                        <div className="h-px flex-1 bg-white/10" />
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleRegister} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                                    <div className="relative group/input">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-[#ea580c] transition-colors" />
                                        <input 
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full bg-black/40 border border-white/5 focus:border-[#ea580c]/50 focus:ring-4 focus:ring-[#ea580c]/10 rounded-[20px] py-5 pl-14 pr-6 text-white text-sm font-medium transition-all outline-none placeholder:text-slate-700"
                                            required
                                        />
                                    </div>
                                </div>

                                {message && status === 'error' && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs font-bold text-red-500 flex items-center gap-3">
                                        <ShieldCheck className="w-4 h-4 shrink-0" />
                                        {message}
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full py-5 bg-[#ea580c] hover:bg-[#ff6a1a] disabled:opacity-50 disabled:hover:bg-[#ea580c] text-white font-black uppercase text-xs tracking-[0.2em] rounded-[20px] shadow-[0_10px_30px_rgba(234,88,12,0.3)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.4)] transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
                                >
                                    {status === 'loading' ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Solicitar Acesso</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="pt-2 text-center">
                                <p className="text-slate-600 text-[9px] leading-relaxed uppercase tracking-tighter font-bold">
                                    Ao solicitar, fernando receberá uma notificação para autorizar seu dispositivo.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 flex items-center justify-center space-x-6 text-slate-600">
                    <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Seguro</span>
                    </div>
                    <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black tracking-widest uppercase">Autorizado</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', background: '#220000', color: 'white', minHeight: '100vh', fontFamily: 'monospace' }}>
                    <h1 style={{ color: '#ff5555' }}>💥 Ocorreu um erro no App</h1>
                    <p>{this.state.error && this.state.error.toString()}</p>
                    <hr style={{ borderColor: '#ff0000', margin: '20px 0' }} />
                    <pre style={{ whiteSpace: 'pre-wrap', color: '#ffaaaa' }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW Registered:', registration))
            .catch(error => console.log('SW Registration failed:', error));
    });
}

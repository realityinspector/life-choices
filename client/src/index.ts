import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Handle WebSocket connection errors globally
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('WebSocket')) {
    console.warn('WebSocket connection error - will retry automatically');
    event.preventDefault();
  }
});

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
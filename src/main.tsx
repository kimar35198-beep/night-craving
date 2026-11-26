import {createRoot} from 'react-dom/client';
import AdminApp from './admin/AdminApp.tsx';
import App from './App.tsx';
import './index.css';

const isAdminPage = window.location.pathname.replace(/\/$/, '') === '/admin';

createRoot(document.getElementById('root')!).render(
  isAdminPage ? <AdminApp /> : <App />
);

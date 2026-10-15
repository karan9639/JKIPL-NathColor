import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app/AppProviders';
import { App } from '@/routes/AppRoutes';
import './index.css';

createRoot(document.getElementById('root')).render(
    <AppProviders><App /></AppProviders>
);

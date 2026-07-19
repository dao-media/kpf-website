import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.scss';

const rootElement = document.getElementById('kpf-accessibility-admin-root');
if (rootElement) {
	createRoot(rootElement).render(<App />);
}

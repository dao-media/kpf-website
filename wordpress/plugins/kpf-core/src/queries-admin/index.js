import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.scss';

const root = document.getElementById('kpf-queries-admin-root');
if (root) {
	createRoot(root).render(<App />);
}

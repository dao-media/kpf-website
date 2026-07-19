import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.scss';

const root = document.getElementById('kpf-page-editor-root');
const pageId = Number(root?.dataset?.pageId || window.kpfPageEditor?.pageId || 0);

if (root && pageId > 0) {
	createRoot(root).render(<App pageId={pageId} />);
}

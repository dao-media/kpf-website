import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.scss';

const root = document.getElementById('kpf-team-editor-root');
const memberId = Number(
	root?.dataset?.memberId || window.kpfTeamEditor?.memberId || 0
);

if (root && memberId > 0) {
	createRoot(root).render(<App memberId={memberId} />);
}

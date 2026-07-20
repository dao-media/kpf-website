import { createPortal, useEffect, useRef, useState } from '@wordpress/element';
import useTagAutocomplete from './TagAutocomplete';

const baseSettings = window.kpfDesignsAdmin?.codeEditor || {};
const STATIC_PLACEHOLDERS = window.kpfDesignsAdmin?.placeholders || [];

function TagPickerHost({ editorRef, ready, sourceHtml }) {
	const menu = useTagAutocomplete(editorRef, {
		enabled: ready,
		staticPlaceholders: STATIC_PLACEHOLDERS,
		sourceHtml,
	});

	if (!menu) return null;
	return createPortal(menu, document.body);
}

export default function CodeEditor({
	id,
	label,
	language,
	value,
	onChange,
	enableTagPicker = false,
}) {
	const textareaRef = useRef(null);
	const editorRef = useRef(null);
	const onChangeRef = useRef(onChange);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!textareaRef.current || !window.wp?.codeEditor?.initialize) return undefined;

		const mode = language === 'css' ? 'text/css' : 'text/html';
		const settings = {
			...baseSettings,
			codemirror: {
				...(baseSettings.codemirror || {}),
				mode,
				theme: 'default',
				lineNumbers: true,
				lineWrapping: false,
				indentUnit: 2,
				tabSize: 2,
				styleActiveLine: true,
				matchBrackets: true,
				autoCloseBrackets: true,
				viewportMargin: 40,
			},
		};
		const instance = window.wp.codeEditor.initialize(textareaRef.current, settings);
		const editor = instance?.codemirror;
		if (!editor) return undefined;

		editorRef.current = editor;
		setReady(true);
		editor.setSize(null, '100%');
		editor.on('change', (changedEditor, change) => {
			if (change.origin !== 'setValue') onChangeRef.current(changedEditor.getValue());
		});

		window.requestAnimationFrame(() => editor.refresh());

		const onResize = () => {
			editor.refresh();
		};
		window.addEventListener('resize', onResize);

		const host = textareaRef.current?.closest('.kpf-source-editor');
		const resizeObserver =
			host && typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => {
						editor.refresh();
					})
				: null;
		resizeObserver?.observe(host);

		return () => {
			window.removeEventListener('resize', onResize);
			resizeObserver?.disconnect();
			editor.toTextArea();
			editorRef.current = null;
			setReady(false);
		};
	}, []);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;
		const mode = language === 'css' ? 'text/css' : 'text/html';
		if (editor.getOption('mode') !== mode) editor.setOption('mode', mode);
		if (editor.getValue() !== value) editor.setValue(value);
		editor.refresh();
	}, [language, value]);

	return (
		<div className="kpf-source-editor kpf-source-editor--vscode-dark">
			<label className="screen-reader-text" htmlFor={id}>
				{label}
			</label>
			<textarea
				ref={textareaRef}
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				spellCheck="false"
			/>
			{enableTagPicker && language === 'html' ? (
				<TagPickerHost editorRef={editorRef} ready={ready} sourceHtml={value} />
			) : null}
		</div>
	);
}

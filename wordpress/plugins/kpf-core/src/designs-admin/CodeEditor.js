import { useEffect, useRef } from '@wordpress/element';

const baseSettings = window.kpfDesignsAdmin?.codeEditor || {};

export default function CodeEditor({ id, label, language, value, onChange }) {
	const textareaRef = useRef(null);
	const editorRef = useRef(null);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!textareaRef.current || !window.wp?.codeEditor?.initialize) return undefined;

		const mode = language === 'css' ? 'text/css' : language === 'svg' ? 'application/xml' : 'text/html';
		const settings = {
			...baseSettings,
			codemirror: {
				...(baseSettings.codemirror || {}),
				mode,
				lineNumbers: true,
				lineWrapping: false,
				indentUnit: 2,
				tabSize: 2,
			},
		};
		const instance = window.wp.codeEditor.initialize(textareaRef.current, settings);
		const editor = instance?.codemirror;
		if (!editor) return undefined;

		editorRef.current = editor;
		editor.on('change', (changedEditor, change) => {
			if (change.origin !== 'setValue') onChangeRef.current(changedEditor.getValue());
		});

		return () => {
			editor.toTextArea();
			editorRef.current = null;
		};
	}, []);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;
		const mode = language === 'css' ? 'text/css' : language === 'svg' ? 'application/xml' : 'text/html';
		if (editor.getOption('mode') !== mode) editor.setOption('mode', mode);
		if (editor.getValue() !== value) editor.setValue(value);
		editor.refresh();
	}, [language, value]);

	return (
		<div className="kpf-source-editor">
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
		</div>
	);
}

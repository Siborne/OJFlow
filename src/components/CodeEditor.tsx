import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { oneDark } from '@codemirror/theme-one-dark';

const LANGUAGE_EXTENSIONS = {
  cpp: () => cpp(),
  c: () => cpp(),
  java: () => java(),
  javascript: () => javascript(),
  python: () => python(),
  rust: () => rust(),
} as const;

export function CodeEditor({
  value,
  language,
  placeholder,
  ariaLabel,
  className,
  onReady,
  testId,
  onChange,
}: {
  value: string;
  language: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  onReady?: (view: unknown) => void;
  testId?: string;
  onChange: (value: string) => void;
}) {
  const extension = LANGUAGE_EXTENSIONS[language as keyof typeof LANGUAGE_EXTENSIONS];

  return (
    <div className={className} aria-label={ariaLabel} data-testid={testId}>
      <CodeMirror
        value={value}
        height="100%"
        minHeight="260px"
        placeholder={placeholder}
        extensions={extension ? [extension()] : []}
        theme={oneDark}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
          autocompletion: true,
        }}
        onCreateEditor={view => onReady?.(view)}
        onChange={useCallback((next: string) => onChange(next), [onChange])}
      />
    </div>
  );
}

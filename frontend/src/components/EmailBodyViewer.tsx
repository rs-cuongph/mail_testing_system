import { useState } from 'react';

interface Props {
  textBody: string | null;
  htmlBody: string | null;
}

export function EmailBodyViewer({ textBody, htmlBody }: Props) {
  const [mode, setMode] = useState<'text' | 'html'>('text');

  const hasHtml = !!htmlBody;
  const hasText = !!textBody;

  return (
    <div className="email-body-viewer">
      {hasHtml && (
        <div className="body-toggle">
          <button
            className={`toggle-btn ${mode === 'text' ? 'active' : ''}`}
            onClick={() => setMode('text')}
          >
            Plain Text
          </button>
          <button
            className={`toggle-btn ${mode === 'html' ? 'active' : ''}`}
            onClick={() => setMode('html')}
          >
            HTML
          </button>
        </div>
      )}

      {mode === 'text' || !hasHtml ? (
        <pre className="body-text">{hasText ? textBody : '(no text body)'}</pre>
      ) : (
        <iframe
          className="body-html"
          srcDoc={htmlBody ?? ''}
          sandbox="allow-same-origin"
          title="Email HTML body"
        />
      )}
    </div>
  );
}

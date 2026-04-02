import { useEffect, useState } from 'react';
import type { EmailSummary } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

interface Props {
  tag: string;
  onSelectEmail: (id: string) => void;
  selectedEmailId: string | null;
}

export function ThreadView({ tag, onSelectEmail, selectedEmailId }: Props) {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [threadAddress, setThreadAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getThreadByTag(tag)
      .then((res) => {
        setEmails(res.emails);
        setThreadAddress(res.thread.fullAddress);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    const socket = getSocket();
    socket.on('email:new', ({ threadTag, email }: { threadTag: string; email: EmailSummary }) => {
      if (threadTag === tag) {
        setEmails((prev) => [email, ...prev]);
      }
    });

    return () => { socket.off('email:new'); };
  }, [tag]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <section className="thread-view">
      <div className="thread-view-header">
        <h3>🧵 {threadAddress}</h3>
        <span className="email-count">{emails.length} messages</span>
      </div>

      {loading && <div className="state-msg">Loading messages...</div>}
      {error && <div className="state-msg error">Error: {error}</div>}
      {!loading && emails.length === 0 && <div className="state-msg muted">No messages in this thread.</div>}

      <ul className="email-list">
        {emails.map((e) => (
          <li
            key={e.id}
            className={`email-item ${selectedEmailId === e.id ? 'selected' : ''}`}
            onClick={() => onSelectEmail(e.id)}
          >
            <div className="email-from">{e.fromEmail}</div>
            <div className="email-subject">{e.subject || '(no subject)'}</div>
            <div className="email-meta">
              <span className="email-date">{formatDate(e.receivedAt)}</span>
              {e.hasAttachments && <span className="attachment-badge">📎 {e.attachmentCount}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

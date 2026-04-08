import { useEffect, useState } from 'react';
import type { EmailSummary } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { MessageSquare, Paperclip, CheckCircle } from 'lucide-react';

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
    
    const onEmailNew = ({ threadTag, email }: { threadTag: string; email: EmailSummary }) => {
      if (threadTag === tag) {
        setEmails((prev) => [email, ...prev]);
      }
    };

    const onEmailRead = ({ emailId }: { emailId: string }) => {
      setEmails((prev) => prev.map((e) => e.id === emailId ? { ...e, isRead: true } : e));
    };

    const onThreadRead = ({ threadTag }: { threadTag: string }) => {
      if (threadTag === tag) {
        setEmails((prev) => prev.map((e) => ({ ...e, isRead: true })));
      }
    };

    const onAllRead = () => {
      setEmails((prev) => prev.map((e) => ({ ...e, isRead: true })));
    };

    socket.on('email:new', onEmailNew);
    socket.on('email:read', onEmailRead);
    socket.on('thread:read', onThreadRead);
    socket.on('all:read', onAllRead);

    return () => { 
      socket.off('email:new', onEmailNew); 
      socket.off('email:read', onEmailRead);
      socket.off('thread:read', onThreadRead);
      socket.off('all:read', onAllRead);
    };
  }, [tag]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const unreadCount = emails.filter((e) => !e.isRead).length;

  const handleMarkThreadAsRead = async () => {
    try {
      await api.markThreadAsRead(tag);
      setEmails((prev) => prev.map((e) => ({ ...e, isRead: true })));
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <section className="thread-view">
      <div className="thread-view-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={20} /> {threadAddress}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="email-count">{emails.length} messages</span>
          {unreadCount > 0 && (
            <button className="btn-secondary-sm" onClick={handleMarkThreadAsRead}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading && <div className="state-msg">Loading messages...</div>}
      {error && <div className="state-msg error">Error: {error}</div>}
      {!loading && emails.length === 0 && <div className="state-msg muted">No messages in this thread.</div>}

      <ul className="email-list">
        {emails.map((e) => (
          <li
            key={e.id}
            className={`email-item ${selectedEmailId === e.id ? 'selected' : ''} ${!e.isRead ? 'unread' : ''}`}
            onClick={() => onSelectEmail(e.id)}
          >
            <div className="email-from">{e.fromEmail}</div>
            <div className="email-subject">{e.subject || '(no subject)'}</div>
            <div className="email-meta">
              <span className="email-date">{formatDate(e.receivedAt)}</span>
              {!e.isRead && <span className="unread-dot">●</span>}
              {e.isRead && <CheckCircle size={14} className="read-icon" style={{ opacity: 0.5, marginLeft: '4px' }} />}
              {e.hasAttachments && <span className="attachment-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Paperclip size={12} /> {e.attachmentCount}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

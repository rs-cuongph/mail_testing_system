import { useEffect, useRef, useState } from 'react';
import type { Thread } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

interface Props {
  selectedTag: string | null;
  onSelectThread: (tag: string) => void;
}

export function ThreadList({ selectedTag, onSelectThread }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const load = async () => {
    try {
      const res = await api.getThreads();
      setThreads(res.data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();

    socket.on('thread:new', ({ thread }: { thread: Thread }) => {
      setThreads((prev) => [thread, ...prev]);
    });

    socket.on('email:new', ({ threadTag }: { threadTag: string }) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.tag === threadTag
            ? { ...t, emailCount: t.emailCount + 1, updatedAt: new Date().toISOString() }
            : t,
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    });

    socket.on('thread:deleted', ({ threadTag }: { threadTag: string }) => {
      setThreads((prev) => prev.filter((t) => t.tag !== threadTag));
    });

    socket.on('all:cleared', () => setThreads([]));

    return () => {
      socket.off('thread:new');
      socket.off('email:new');
      socket.off('thread:deleted');
      socket.off('all:cleared');
    };
  }, []);

  const handleDelete = async (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete thread "${tag}"?`)) return;
    try {
      await api.deleteThread(tag);
      setThreads((prev) => prev.filter((t) => t.tag !== tag));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL threads and emails?')) return;
    setClearing(true);
    try {
      await api.deleteAll();
      setThreads([]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <aside className="thread-list">
      <div className="thread-list-header">
        <h2>📬 Threads</h2>
        <button className="btn-danger-sm" onClick={handleClearAll} disabled={clearing}>
          {clearing ? '...' : '🗑 Clear All'}
        </button>
      </div>

      {loading && <div className="state-msg">Loading...</div>}
      {error && <div className="state-msg error">Error: {error}</div>}
      {!loading && threads.length === 0 && (
        <div className="state-msg muted">No threads yet. Send an email to gens+tag@rn.work</div>
      )}

      <ul className="thread-items">
        {threads.map((t) => (
          <li
            key={t.id}
            className={`thread-item ${selectedTag === t.tag ? 'selected' : ''}`}
            onClick={() => onSelectThread(t.tag)}
          >
            <div className="thread-address">{t.fullAddress}</div>
            <div className="thread-meta">
              <span className="thread-count">{t.emailCount} email{t.emailCount !== 1 ? 's' : ''}</span>
              {t.latestSubject && <span className="thread-subject">{t.latestSubject}</span>}
            </div>
            <button className="btn-delete-thread" onClick={(e) => handleDelete(t.tag, e)}>✕</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

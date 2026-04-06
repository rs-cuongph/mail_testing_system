import { useEffect, useRef, useState } from 'react';
import type { Thread, Category } from '../types';
import { api, type AppConfig } from '../services/api';
import { getSocket } from '../services/socket';
import { SearchBar } from './SearchBar';
import { FilterTabs } from './FilterTabs';
import { CategoryManager } from './CategoryManager';
import { CategoryBadge } from './CategoryBadge';
import { ProfileSwitcher } from './ProfileSwitcher';
import { Trash2, X, CheckSquare, Layers, Tag, Settings } from 'lucide-react';

interface Props {
  selectedTag: string | null;
  onSelectThread: (tag: string) => void;
  config: AppConfig;
  onSearch: (query: string) => void;
}

export function ThreadList({ selectedTag, onSelectThread, config, onSearch }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [groupedView, setGroupedView] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [assignDropdown, setAssignDropdown] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const loadData = async () => {
    try {
      const [threadsRes, catsRes] = await Promise.all([
        api.getThreads(),
        api.getCategories()
      ]);
      setThreads(threadsRes.data);
      setCategories(catsRes);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();

    socket.on('thread:new', ({ thread }: { thread: Thread }) => {
      setThreads((prev) => [
        {
          ...thread,
          emailCount: thread.emailCount || 0,
          unreadCount: thread.unreadCount || 0,
        },
        ...prev,
      ]);
    });

    socket.on('email:new', ({ threadTag }: { threadTag: string }) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.tag === threadTag
            ? { ...t, emailCount: (t.emailCount || 0) + 1, unreadCount: (t.unreadCount || 0) + 1, updatedAt: new Date().toISOString() }
            : t,
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    });

    socket.on('email:read', ({ threadTag }: { threadTag: string }) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.tag === threadTag
            ? { ...t, unreadCount: Math.max(0, t.unreadCount - 1) }
            : t,
        )
      );
    });

    socket.on('thread:deleted', ({ threadTag }: { threadTag: string }) => {
      setThreads((prev) => prev.filter((t) => t.tag !== threadTag));
    });

    socket.on('all:cleared', () => setThreads([]));

    socket.on('thread:read', ({ threadTag }: { threadTag: string }) => {
      setThreads((prev) => prev.map((t) => t.tag === threadTag ? { ...t, unreadCount: 0 } : t));
    });

    socket.on('all:read', () => {
      setThreads((prev) => prev.map((t) => ({ ...t, unreadCount: 0 })));
    });

    socket.on('profile:switched', () => {
      loadData();
    });

    return () => {
      socket.off('thread:new');
      socket.off('email:new');
      socket.off('email:read');
      socket.off('thread:deleted');
      socket.off('all:cleared');
      socket.off('thread:read');
      socket.off('all:read');
      socket.off('profile:switched');
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

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAsRead();
      setThreads((prev) => prev.map((t) => ({ ...t, unreadCount: 0 })));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAssignCategory = async (threadId: string, categoryId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignDropdown(null);
    try {
      if (categoryId) {
        await api.assignThreads(categoryId, [threadId]);
      } else {
        const t = threads.find(x => x.id === threadId);
        if (t?.category) {
          await api.unassignThread(t.category.id, threadId);
        }
      }
      loadData(); // reload to get updated threads
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const filteredThreads = filter === 'unread' ? threads.filter(t => t.unreadCount > 0) : threads;

  // Group threads
  const groupedThreads: Record<string, typeof threads> = { 'Uncategorized': [] };
  filteredThreads.forEach(t => {
    if (t.category) {
      if (!groupedThreads[t.category.id]) groupedThreads[t.category.id] = [];
      groupedThreads[t.category.id].push(t);
    } else {
      groupedThreads['Uncategorized'].push(t);
    }
  });

  return (
    <aside className="thread-list">
      <div className="thread-list-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Threads
        </h2>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <ProfileSwitcher />
          <button className={`btn-icon ${groupedView ? 'active' : ''}`} onClick={() => setGroupedView(!groupedView)} title="Group by category">
            <Layers size={16} />
          </button>
          <button className="btn-icon" onClick={() => setShowCategoryManager(true)} title="Manage categories">
            <Settings size={16} />
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {totalUnread > 0 && (
          <button className="btn-secondary-sm" onClick={handleMarkAllRead}>
            <CheckSquare size={16} /> <span>Mark Read</span>
          </button>
        )}
        <button className="btn-danger-sm" onClick={handleClearAll} disabled={clearing}>
          {clearing ? '...' : <><Trash2 size={16} /> <span>Clear All</span></>}
        </button>
      </div>

      <SearchBar onSearch={onSearch} />
      <FilterTabs filter={filter} onChange={setFilter} />

      {loading && <div className="state-msg">Loading...</div>}
      {error && <div className="state-msg error">Error: {error}</div>}
      {!loading && threads.length === 0 && (
        <div className="state-msg muted">No threads yet. Send an email to {config.mailBaseAddress}+tag@{config.mailDomain}</div>
      )}

      {groupedView ? (
        <div className="thread-items" style={{ padding: '16px' }}>
          {categories.map(c => {
            const items = groupedThreads[c.id] || [];
            if (items.length === 0) return null;
            return (
              <div key={c.id} className="category-group" style={{ marginBottom: '16px' }}>
                <div className="category-group-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CategoryBadge name={c.name} color={c.color} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{items.length} </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {items.map(t => renderThreadItem(t))}
                </ul>
              </div>
            );
          })}
          {groupedThreads['Uncategorized'].length > 0 && (
            <div className="category-group">
              <div className="category-group-header" style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Uncategorized ({groupedThreads['Uncategorized'].length})
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {groupedThreads['Uncategorized'].map(t => renderThreadItem(t))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <ul className="thread-items">
          {filteredThreads.map(t => renderThreadItem(t))}
        </ul>
      )}

      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          onCategoriesChange={loadData}
        />
      )}
    </aside>
  );

  function renderThreadItem(t: Thread) {
    return (
      <li
        key={t.id}
        className={`thread-item ${selectedTag === t.tag ? 'selected' : ''} ${t.unreadCount > 0 ? 'unread' : ''}`}
        onClick={() => onSelectThread(t.tag)}
        style={{ position: 'relative', zIndex: assignDropdown === t.id ? 50 : 1 }}
      >
        {t.unreadCount > 0 && <span className="unread-badge">{t.unreadCount > 99 ? '99+' : t.unreadCount}</span>}
        {t.category && !groupedView && (
          <div style={{ marginBottom: '4px' }}>
            <CategoryBadge name={t.category.name} color={t.category.color} />
          </div>
        )}
        <div className="thread-address" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
            {t.fullAddress}
          </span>
        </div>
        <div className="thread-meta">
          <span className="thread-count">{t.emailCount} email{t.emailCount !== 1 ? 's' : ''}</span>
          {t.latestSubject && <span className="thread-subject">{t.latestSubject}</span>}
        </div>

        <div className="thread-actions" style={{ display: 'flex', gap: '4px', position: 'absolute', top: '12px', right: '12px' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              onClick={(e) => { e.stopPropagation(); setAssignDropdown(assignDropdown === t.id ? null : t.id); }}
              title="Assign to category"
            >
              <Tag size={16} />
            </button>
            {assignDropdown === t.id && (
              <div
                className="category-assign-dropdown"
                style={{ position: 'absolute', right: 0, top: '24px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', zIndex: 100, minWidth: '160px', width: 'max-content', boxShadow: 'var(--shadow)' }}
              >
                <div style={{ padding: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assign to...</div>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={(e) => handleAssignCategory(t.id, c.id, e)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '6px', background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    {t.category?.id === c.id && <CheckSquare size={12} color="var(--accent)" />}
                  </button>
                ))}
                <button
                  onClick={(e) => handleAssignCategory(t.id, null, e)}
                  style={{ width: '100%', padding: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', marginTop: '4px', borderTop: '1px solid var(--border-light)' }}
                >
                  Remove category
                </button>
              </div>
            )}
          </div>
          <button className="btn-delete-thread" onClick={(e) => { setAssignDropdown(null); handleDelete(t.tag, e); }}><X size={16} /></button>
        </div>
      </li>
    );
  }
}

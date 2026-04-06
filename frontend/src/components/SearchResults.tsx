import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SearchResult } from '../types';
import { MessageSquare, ArrowRight, Calendar } from 'lucide-react';

interface Props {
  query: string;
  onSelectResult: (threadTag: string, emailId: string) => void;
}

export function SearchResults({ query, onSelectResult }: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    api.search(query)
      .then(res => {
        setResults(res);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="search-results" style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>
        Search Results for "{query}"
        {results.length > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '14px', fontWeight: 400 }}>({results.length} found)</span>}
      </h3>

      {loading && <div className="state-msg">Searching...</div>}
      {error && <div className="state-msg error">Error: {error}</div>}
      {!loading && query && results.length === 0 && <div className="state-msg muted">No emails found matching your query.</div>}

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {results.map((r) => (
          <li 
            key={r.id} 
            style={{ 
              padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all var(--transition-normal)'
            }}
            onClick={() => onSelectResult(r.threadTag, r.id)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.subject || '(no subject)'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> {formatDate(r.receivedAt)}
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--accent-light)', marginBottom: '12px', fontWeight: 500 }}>From: {r.fromEmail}</div>
            
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', alignItems: 'center', gap: '6px', background: 'var(--bg-base)', padding: '6px 10px', borderRadius: '6px', display: 'inline-flex' }}>
              <MessageSquare size={14} /> Thread: <strong>{r.threadTag}</strong>
              <ArrowRight size={14} style={{ opacity: 0.5 }} />
              {r.threadFullAddress}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Inbox, MailWarning } from 'lucide-react';

interface Props {
  filter: 'all' | 'unread';
  onChange: (filter: 'all' | 'unread') => void;
}

export function FilterTabs({ filter, onChange }: Props) {
  return (
    <div className="filter-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
      <button 
        className={`filter-tab ${filter === 'all' ? 'active' : ''}`} 
        onClick={() => onChange('all')}
        style={{ 
          flex: 1, padding: '12px', background: 'none', border: 'none', color: filter === 'all' ? 'var(--accent)' : 'var(--text-muted)', 
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600,
          borderBottom: filter === 'all' ? '2px solid var(--accent)' : '2px solid transparent'
        }}
      >
        <Inbox size={16} /> All
      </button>
      <button 
        className={`filter-tab ${filter === 'unread' ? 'active' : ''}`} 
        onClick={() => onChange('unread')}
        style={{ 
          flex: 1, padding: '12px', background: 'none', border: 'none', color: filter === 'unread' ? 'var(--accent)' : 'var(--text-muted)', 
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600,
          borderBottom: filter === 'unread' ? '2px solid var(--accent)' : '2px solid transparent'
        }}
      >
        <MailWarning size={16} /> Unread
      </button>
    </div>
  );
}

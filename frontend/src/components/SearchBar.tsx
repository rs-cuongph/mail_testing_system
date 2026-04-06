import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="search-bar" style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Search size={16} style={{ position: 'absolute', left: '36px', color: 'var(--text-muted)' }} />
      <input
        type="text"
        placeholder="Search emails..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{
          width: '100%', padding: '8px 32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'var(--bg-elevated)', color: 'var(--text-primary)', outline: 'none'
        }}
      />
      {value && (
        <button
          onClick={() => setValue('')}
          style={{ position: 'absolute', right: '36px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

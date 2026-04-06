import { Settings, X, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';
import type { Category } from '../types';

interface Props {
  onClose: () => void;
  categories: Category[];
  onCategoriesChange: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function CategoryManager({ onClose, categories, onCategoriesChange }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[5]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.createCategory({ name: name.trim(), color });
      setName('');
      onCategoriesChange();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Threads will become uncategorized.')) return;
    setLoading(true);
    try {
      await api.deleteCategory(id);
      onCategoriesChange();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="modal-content" style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '400px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} /> Manage Categories</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input 
              type="text" 
              placeholder="New category name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none' }}
            />
            <button 
              onClick={handleCreate} 
              disabled={loading || !name.trim()}
              style={{ padding: '8px 12px', background: 'var(--bg-elevated)', color: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={16} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {PRESET_COLORS.map(c => (
              <button 
                key={c}
                onClick={() => setColor(c)}
                style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }}
              />
            ))}
          </div>
        </div>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
          {categories.map(c => (
            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.color }} />
                <span>{c.name}</span>
              </div>
              <button 
                className="btn-danger-sm" 
                onClick={() => handleDelete(c.id)}
                disabled={loading}
                style={{ padding: '4px 8px' }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {categories.length === 0 && <div className="state-msg muted" style={{ padding: '12px 0' }}>No categories yet.</div>}
        </ul>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Lock, Mail, ServerCog, Loader2, AlertCircle } from 'lucide-react';
import { settingsApi } from '../services/settings.api';
import type { SystemSettings } from '../services/settings.api';
import './SetupPage.css';

export function SetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SystemSettings>({
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    imapTls: true,
    imapMode: 'idle',
    imapPollInterval: 5000,
    mailDomain: '',
    mailBaseAddress: 'inbox',
  });

  useEffect(() => {
    // Attempt to load existing if any
    settingsApi.getSettings().then(data => {
      setFormData(data);
    }).catch(() => {
      // It's normal if not set up
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await settingsApi.updateSettings(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <ServerCog size={48} className="mx-auto text-blue-400 mb-4" style={{ margin: '0 auto 16px auto', display: 'block', color: '#60a5fa' }} />
          <h1>System Configuration</h1>
          <p>Initial setup for IMAP and Mail Domain settings.</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form className="setup-form" onSubmit={handleSubmit}>
          {/* IMAP Section */}
          <div className="form-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <Server size={18} /> IMAP Server
            </h3>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Host</label>
                <input required type="text" name="imapHost" value={formData.imapHost} onChange={handleChange} placeholder="imap.example.com" />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input required type="number" name="imapPort" value={formData.imapPort} onChange={handleChange} placeholder="993" />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Username</label>
                <input required type="text" name="imapUser" value={formData.imapUser} onChange={handleChange} placeholder="user@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input required type="password" name="imapPassword" value={formData.imapPassword} onChange={handleChange} placeholder="••••••••" />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '16px', alignItems: 'center' }}>
              <div className="checkbox-group form-group">
                <input type="checkbox" id="imapTls" name="imapTls" checked={formData.imapTls} onChange={handleChange} />
                <label htmlFor="imapTls">Enable TLS</label>
              </div>
              <div className="form-group">
                <label>Sync Mode</label>
                <select name="imapMode" value={formData.imapMode} onChange={handleChange}>
                  <option value="idle">Real-time (IDLE)</option>
                  <option value="poll">Polling</option>
                </select>
              </div>
              {formData.imapMode === 'poll' && (
                <div className="form-group">
                  <label>Poll Interval (ms)</label>
                  <input required type="number" name="imapPollInterval" value={formData.imapPollInterval} onChange={handleChange} />
                </div>
              )}
            </div>
          </div>

          {/* Mail Domain Section */}
          <div className="form-section" style={{ marginTop: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <Mail size={18} /> Mail Parsing Rules
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label>Mail Domain</label>
                <input required type="text" name="mailDomain" value={formData.mailDomain} onChange={handleChange} placeholder="talentgrid.io.vn" />
              </div>
              <div className="form-group">
                <label>Base Address</label>
                <input required type="text" name="mailBaseAddress" value={formData.mailBaseAddress} onChange={handleChange} placeholder="no-reply" />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="setup-button" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
              {loading ? 'Testing Connection...' : 'Save & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

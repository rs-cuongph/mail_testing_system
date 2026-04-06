import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Lock, Mail, Settings as SettingsIcon, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { settingsApi } from '../services/settings.api';
import type { SystemSettings } from '../services/settings.api';
import './SetupPage.css'; // Reuse setup styles

export function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    settingsApi.getSettings().then(data => {
      // The masked password comes as '••••••••'
      setFormData(data);
    }).catch(err => {
      setError('Failed to load settings: ' + err.message);
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
    setSuccess(null);

    try {
      const res = await settingsApi.updateSettings(formData);
      setSuccess(res.message);
      // Re-fetch to get correct masked form data
      const data = await settingsApi.getSettings();
      setFormData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <button 
          onClick={() => navigate('/')} 
          style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="setup-header">
          <SettingsIcon size={48} className="mx-auto text-blue-400 mb-4" style={{ margin: '0 auto 16px auto', display: 'block', color: '#60a5fa' }} />
          <h1>Settings</h1>
          <p>Update system configuration and IMAP credentials.</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="error-message" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }}>
            <span>✅ {success}</span>
          </div>
        )}

        <form className="setup-form" onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
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
                <label>Password (Leave as •••••••• to keep current)</label>
                <input required type="password" name="imapPassword" value={formData.imapPassword} onChange={handleChange} placeholder="••••••••" />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '16px', alignItems: 'center' }}>
              <div className="checkbox-group form-group">
                <input type="checkbox" id="imapTlsSettings" name="imapTls" checked={formData.imapTls} onChange={handleChange} />
                <label htmlFor="imapTlsSettings">Enable TLS</label>
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
              {loading ? 'Testing & Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

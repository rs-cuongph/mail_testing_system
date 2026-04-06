import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Lock, Mail, Settings as SettingsIcon, Loader2, AlertCircle, ArrowLeft, CheckCircle2, Upload, Download } from 'lucide-react';
import { settingsApi } from '../services/settings.api';
import type { SystemSettings } from '../services/settings.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import './SetupPage.css';

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
      setFormData(data);
    }).catch(err => {
      setError('Failed to load settings: ' + err.message);
    });
  }, []);

  const handleChangeText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const settings = await settingsApi.getSettings();
      const { imapPassword: _omit, ...exportData } = settings;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mail-config.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export config');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setFormData(prev => ({
          ...prev,
          ...parsed,
          imapPassword: '', // always blank on import
        }));
        setSuccess('Config loaded — please enter the password then save.');
      } catch {
        setError('Invalid config file. Expected JSON format.');
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await settingsApi.updateSettings(formData);
      setSuccess(res.message);
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
      <div className="setup-card" style={{ maxWidth: '680px' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="setup-header">
          <SettingsIcon size={40} style={{ margin: '0 auto 12px auto', display: 'block', color: '#60a5fa' }} />
          <h1>Settings</h1>
          <p>Update system configuration and IMAP credentials.</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="error-message" style={{ marginBottom: '20px', background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }}>
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 mt-2">

          {/* ── IMAP Server Section ── */}
          <section>
            <div className="flex items-center gap-2 pb-3 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Server size={16} style={{ color: '#60a5fa' }} />
              <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#94a3b8', letterSpacing: '0.08em' }}>IMAP Server</h3>
            </div>

            <div className="grid gap-4">
              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Host</Label>
                  <Input
                    required
                    type="text"
                    name="imapHost"
                    value={formData.imapHost}
                    onChange={handleChangeText}
                    placeholder="imap.example.com"
                    className="h-10 text-sm"
                    style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Port</Label>
                  <Input
                    required
                    type="number"
                    name="imapPort"
                    value={formData.imapPort}
                    onChange={handleChangeText}
                    className="h-10 text-sm"
                    style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                  />
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Username</Label>
                  <Input
                    required
                    type="text"
                    name="imapUser"
                    value={formData.imapUser}
                    onChange={handleChangeText}
                    placeholder="user@example.com"
                    className="h-10 text-sm"
                    style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                    Password <span style={{ color: '#64748b', fontWeight: 400 }}>(leave blank to keep current)</span>
                  </Label>
                  <Input
                    type="password"
                    name="imapPassword"
                    value={formData.imapPassword}
                    onChange={handleChangeText}
                    placeholder="••••••••"
                    className="h-10 text-sm"
                    style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                  />
                </div>
              </div>

              {/* TLS + Sync Mode + Poll Interval */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Sync Mode</Label>
                  <Select value={formData.imapMode} onValueChange={(val) => setFormData(prev => ({ ...prev, imapMode: val ?? 'idle' }))}>
                    <SelectTrigger className="h-10 text-sm" style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1e293b', borderColor: 'rgba(255,255,255,0.1)' }}>
                      <SelectItem value="idle" className="text-slate-200 focus:bg-slate-700 focus:text-slate-50">Real-time (IDLE)</SelectItem>
                      <SelectItem value="poll" className="text-slate-200 focus:bg-slate-700 focus:text-slate-50">Polling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.imapMode === 'poll' && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Poll Interval (ms)</Label>
                    <Input
                      required
                      type="number"
                      name="imapPollInterval"
                      value={formData.imapPollInterval}
                      onChange={handleChangeText}
                      className="h-10 text-sm"
                      style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 h-10 mt-auto">
                  <Checkbox
                    id="imapTlsSettings"
                    checked={formData.imapTls}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, imapTls: checked as boolean }))}
                    className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="imapTlsSettings" className="text-sm cursor-pointer" style={{ color: '#e2e8f0', fontWeight: 400 }}>Enable TLS / SSL</Label>
                </div>
              </div>
            </div>
          </section>

          {/* ── Mail Rules Section ── */}
          <section>
            <div className="flex items-center gap-2 pb-3 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Mail size={16} style={{ color: '#60a5fa' }} />
              <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#94a3b8', letterSpacing: '0.08em' }}>Mail Parsing Rules</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Mail Domain</Label>
                <Input
                  required
                  type="text"
                  name="mailDomain"
                  value={formData.mailDomain}
                  onChange={handleChangeText}
                  placeholder="example.com"
                  className="h-10 text-sm"
                  style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Base Address</Label>
                <Input
                  required
                  type="text"
                  name="mailBaseAddress"
                  value={formData.mailBaseAddress}
                  onChange={handleChangeText}
                  placeholder="inbox"
                  className="h-10 text-sm"
                  style={{ background: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc' }}
                />
              </div>
            </div>

            <p className="mt-2 text-xs" style={{ color: '#64748b' }}>
              Emails sent to <code style={{ color: '#93c5fd', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: '4px' }}>{formData.mailBaseAddress}+tag@{formData.mailDomain}</code> will be grouped by <code style={{ color: '#93c5fd', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: '4px' }}>tag</code>.
            </p>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Import / Export */}
            <div className="flex gap-2">
              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 text-xs font-medium gap-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Upload size={13} /> Import Config
              </Button>
              <Button
                type="button"
                onClick={handleExport}
                className="h-9 px-4 text-xs font-medium gap-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Download size={13} /> Export Config
              </Button>
            </div>

            {/* Save */}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-6 text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: 'white', border: 'none' }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin mr-2" />Saving...</>
                : <><Lock size={15} className="mr-2" />Save Settings</>
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

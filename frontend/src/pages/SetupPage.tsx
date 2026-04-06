import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Lock, Mail, ServerCog, Loader2, AlertCircle, Upload } from 'lucide-react';
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
    settingsApi.getSettings().then(data => {
      setFormData(data);
    }).catch(() => {});
  }, []);

  const handleChangeText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setFormData(prev => ({ ...prev, ...parsed, imapPassword: '' }));
      } catch {
        setError('Invalid config file. Expected JSON format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      <div className="setup-card" style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div className="setup-header">
          <ServerCog size={40} style={{ margin: '0 auto 12px auto', display: 'block', color: '#60a5fa' }} />
          <h1>System Configuration</h1>
          <p>Connect your IMAP account to start receiving and testing emails.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 mt-2">

          {/* ── IMAP Server Section ── */}
          <section>
            <div className="flex items-center gap-2 pb-3 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Server size={16} style={{ color: '#60a5fa' }} />
              <h3 className="text-sm font-semibold uppercase" style={{ color: '#94a3b8', letterSpacing: '0.08em' }}>IMAP Server</h3>
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
                  <Label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Password</Label>
                  <Input
                    required
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

              {/* Sync Mode + Poll Interval + TLS */}
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
                    id="imapTls"
                    checked={formData.imapTls}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, imapTls: checked as boolean }))}
                    className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="imapTls" className="text-sm cursor-pointer" style={{ color: '#e2e8f0', fontWeight: 400 }}>Enable TLS / SSL</Label>
                </div>
              </div>
            </div>
          </section>

          {/* ── Mail Rules Section ── */}
          <section>
            <div className="flex items-center gap-2 pb-3 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Mail size={16} style={{ color: '#60a5fa' }} />
              <h3 className="text-sm font-semibold uppercase" style={{ color: '#94a3b8', letterSpacing: '0.08em' }}>Mail Parsing Rules</h3>
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
              Emails sent to <code style={{ color: '#93c5fd', background: 'rgba(96,165,250,0.1)', padding: '1px 5px', borderRadius: '4px' }}>{formData.mailBaseAddress || 'inbox'}+tag@{formData.mailDomain || 'example.com'}</code> will be grouped by tag.
            </p>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Import */}
            <div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 text-xs font-medium gap-1.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Upload size={13} /> Import Config
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
                ? <><Loader2 size={15} className="animate-spin mr-2" />Testing Connection...</>
                : <><Lock size={15} className="mr-2" />Save & Connect</>
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
          <ServerCog size={40} className="mx-auto mb-3 block text-blue-500" />
          <h1>System Configuration</h1>
          <p>Connect your IMAP account to start receiving and testing emails.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message mb-5">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 mt-2">

          {/* ── IMAP Server Section ── */}
          <section>
            <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-200">
              <Server size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">IMAP Server</h3>
            </div>

            <div className="grid gap-4">
              {/* Host + Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-slate-500">Host</Label>
                  <Input
                    required
                    type="text"
                    name="imapHost"
                    value={formData.imapHost}
                    onChange={handleChangeText}
                    placeholder="imap.example.com"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-slate-500">Port</Label>
                  <Input
                    required
                    type="number"
                    name="imapPort"
                    value={formData.imapPort}
                    onChange={handleChangeText}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-slate-500">Username</Label>
                  <Input
                    required
                    type="text"
                    name="imapUser"
                    value={formData.imapUser}
                    onChange={handleChangeText}
                    placeholder="user@example.com"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-slate-500">Password</Label>
                  <Input
                    required
                    type="password"
                    name="imapPassword"
                    value={formData.imapPassword}
                    onChange={handleChangeText}
                    placeholder="••••••••"
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Sync Mode + Poll Interval + TLS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-slate-500">Sync Mode</Label>
                  <Select value={formData.imapMode} onValueChange={(val) => setFormData(prev => ({ ...prev, imapMode: val ?? 'idle' }))}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle" className="text-slate-800 focus:bg-slate-100 focus:text-slate-900">Real-time (IDLE)</SelectItem>
                      <SelectItem value="poll" className="text-slate-800 focus:bg-slate-100 focus:text-slate-900">Polling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.imapMode === 'poll' && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-500">Poll Interval (ms)</Label>
                    <Input
                      required
                      type="number"
                      name="imapPollInterval"
                      value={formData.imapPollInterval}
                      onChange={handleChangeText}
                      className="h-10 text-sm"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 h-10 mt-auto">
                  <Checkbox
                    id="imapTls"
                    checked={formData.imapTls}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, imapTls: checked as boolean }))}
                    className="border-slate-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="imapTls" className="text-sm cursor-pointer text-slate-700 font-normal">Enable TLS / SSL</Label>
                </div>
              </div>
            </div>
          </section>

          {/* ── Mail Rules Section ── */}
          <section>
            <div className="flex items-center gap-2 pb-3 mb-5 border-b border-slate-200">
              <Mail size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Mail Parsing Rules</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-slate-500">Mail Domain</Label>
                <Input
                  required
                  type="text"
                  name="mailDomain"
                  value={formData.mailDomain}
                  onChange={handleChangeText}
                  placeholder="example.com"
                  className="h-10 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-slate-500">Base Address</Label>
                <Input
                  required
                  type="text"
                  name="mailBaseAddress"
                  value={formData.mailBaseAddress}
                  onChange={handleChangeText}
                  placeholder="inbox"
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Emails sent to <code className="text-blue-700 bg-blue-50 px-1.5 py-px rounded text-xs">{formData.mailBaseAddress || 'inbox'}+tag@{formData.mailDomain || 'example.com'}</code> will be grouped by tag.
            </p>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            {/* Import */}
            <div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-4 text-xs font-medium gap-1.5"
              >
                <Upload size={13} /> Import Config
              </Button>
            </div>

            {/* Save */}
            <Button
              type="submit"
              disabled={loading}
              className="h-10 px-6 text-sm font-medium"
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

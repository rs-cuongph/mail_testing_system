import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Server, Check, Trash2, Edit2, Loader2, Save, AlertCircle, Download, Upload, FileJson, Shield, Globe, Mail } from 'lucide-react';
import { profilesApi, type ImapProfile } from '../services/profiles.api';
import { useProfile } from '../contexts/ProfileContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVIDER_PRESETS } from '../lib/provider-presets';
import './SetupPage.css';

export function ProfilesPage() {
  const navigate = useNavigate();
  const { setActiveProfileId } = useProfile();
  
  const [profiles, setProfiles] = useState<ImapProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<ImapProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ImapProfile>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await profilesApi.exportProfiles();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mail-testing-profiles-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export profiles');
    }
  };

  const handleExportTemplate = () => {
    try {
      const template = [{
        "name": "Template Profile",
        "provider": "gmail",
        "imapHost": "imap.gmail.com",
        "imapPort": 993,
        "imapUser": "your.email@gmail.com",
        "imapTls": true,
        "imapMode": "idle",
        "imapPollInterval": 5000,
        "mailDomain": "runsystem.work",
        "mailBaseAddress": "gens"
      }];
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mail-testing-profiles-template.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await profilesApi.importProfiles(data);
      alert(`Successfully imported ${result.imported} profiles!\nNote: You will need to click 'Edit' and re-enter passwords for imported profiles before they can connect.`);
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || 'Failed to import profiles. Ensure file is valid JSON.');
      setLoading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchProfiles = async () => {
    try {
      const data = await profilesApi.getProfiles();
      setProfiles(data);
      if (data.length > 0 && !selectedProfile && !isEditing) {
        setSelectedProfile(data[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleAddNew = () => {
    setSelectedProfile(null);
    setFormData({
      name: '', provider: 'custom', imapHost: '', imapPort: 993, imapUser: '',
      imapPassword: '', imapTls: true, imapMode: 'idle', imapPollInterval: 5000,
      mailDomain: '', mailBaseAddress: 'inbox'
    });
    setIsEditing(true);
    setError(null);
  };

  const handleEdit = (p: ImapProfile) => {
    setSelectedProfile(p);
    setFormData({ ...p, imapPassword: '' });
    setIsEditing(true);
    setError(null);
  };

  const handleSelect = (p: ImapProfile) => {
    setSelectedProfile(p);
    setIsEditing(false);
    setError(null);
  };

  const handleActivate = async (id: string) => {
    try {
      await profilesApi.activateProfile(id);
      setActiveProfileId(id);
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || 'Failed to activate profile');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) return;
    try {
      await profilesApi.deleteProfile(id);
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
        setIsEditing(false);
      }
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile');
    }
  };

  const handleChangeText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let savedProfile;
      if (selectedProfile) {
        savedProfile = await profilesApi.updateProfile(selectedProfile.id, formData);
      } else {
        savedProfile = await profilesApi.createProfile(formData as ImapProfile);
      }
      setSelectedProfile(savedProfile);
      setIsEditing(false);
      await fetchProfiles();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-container flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 shadow-lg rounded-2xl flex w-full max-w-6xl h-[82vh] overflow-hidden">

        {/* ── Left Sidebar ── */}
        <div className="w-[340px] flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <Plus size={16} /> New Profile
            </button>
          </div>

          {/* Profile list */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No profiles yet</div>
            ) : (
              profiles.map(p => {
                const isSelected = selectedProfile?.id === p.id && !isEditing;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[15px] font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                        {p.name}
                      </span>
                      {p.isActive && (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className={`text-sm flex items-center gap-1.5 truncate ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                      <Mail size={13} /> {p.imapUser}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Sidebar footer: Import/Template/Export */}
          <div className="p-3 border-t border-slate-100 flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 px-0 text-[13px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
            >
              <Upload size={14} /> Import
            </button>
            <button
              onClick={handleExportTemplate}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 px-0 text-[13px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
            >
              <FileJson size={14} /> Template
            </button>
            <button
              onClick={handleExport}
              disabled={profiles.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 px-0 text-[13px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* ── Right Content ── */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {/* Error banner */}
          {error && (
            <div className="mx-6 mt-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* ── View Mode ── */}
          {!isEditing && selectedProfile ? (
            <div className="p-8 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Server size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">{selectedProfile.name}</h2>
                        {selectedProfile.isActive && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] text-slate-500 mt-1">{selectedProfile.imapUser} · {selectedProfile.imapHost}:{selectedProfile.imapPort}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(selectedProfile)}
                    className="flex items-center justify-center w-10 h-10 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-lg shadow-sm"
                    title="Edit Profile"
                  >
                    <Edit2 size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(selectedProfile.id)}
                    className="flex items-center justify-center w-10 h-10 text-red-600 border-red-200 bg-white hover:bg-red-50 hover:text-red-700 rounded-lg shadow-sm"
                    title="Delete Profile"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Connection */}
                <div className="border border-slate-100 rounded-xl p-5 bg-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connection</span>
                  </div>
                  <dl className="space-y-2.5">
                    {[
                      { label: 'Host', value: selectedProfile.imapHost },
                      { label: 'Port', value: selectedProfile.imapPort },
                      { label: 'TLS', value: selectedProfile.imapTls ? 'Enabled' : 'Disabled' },
                      { label: 'Mode', value: selectedProfile.imapMode === 'idle' ? 'IDLE (Real-time)' : 'Polling' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="text-sm text-slate-400 font-medium w-16">{label}</dt>
                        <dd className="text-[15px] text-slate-700 font-medium text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Mail Rules */}
                <div className="border border-slate-100 rounded-xl p-5 bg-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe size={14} className="text-blue-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mail Rules</span>
                  </div>
                  <dl className="space-y-2.5">
                    {[
                      { label: 'Domain', value: selectedProfile.mailDomain },
                      { label: 'Base Addr', value: selectedProfile.mailBaseAddress },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="text-sm text-slate-400 font-medium w-24">{label}</dt>
                        <dd className="text-[15px] text-slate-700 font-medium text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-400">Receives mail at</p>
                    <code className="text-[13px] text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg mt-1.5 block font-mono">
                      {selectedProfile.mailBaseAddress}+tag@{selectedProfile.mailDomain}
                    </code>
                  </div>
                </div>
              </div>

              {/* Activate */}
              {!selectedProfile.isActive && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleActivate(selectedProfile.id)}
                    className="flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <Check size={16} /> Set as Active Profile
                  </button>
                </div>
              )}
            </div>

          ) : isEditing ? (
            /* ── Edit Mode ── */
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {selectedProfile ? 'Edit Profile' : 'New Profile'}
              </h2>

              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-500">Profile Name</Label>
                    <Input required name="name" value={formData.name || ''} onChange={handleChangeText} placeholder="e.g. Work Gmail" className="h-9 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-500">Email Provider</Label>
                    <Select
                      value={formData.provider || 'custom'}
                      onValueChange={(val) => {
                        const providerVal = val || 'custom';
                        const preset = PROVIDER_PRESETS.find(p => p.id === providerVal);
                        setFormData(prev => ({
                          ...prev,
                          provider: providerVal,
                          ...(preset && providerVal !== 'custom' ? {
                            imapHost: preset.imapHost,
                            imapPort: preset.imapPort,
                            imapTls: preset.imapTls
                          } : {})
                        }));
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_PRESETS.map(p => (
                          <SelectItem key={p.id} value={p.id} className={p.id !== 'custom' ? 'hidden' : ''}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(() => {
                  const preset = PROVIDER_PRESETS.find(p => p.id === formData.provider);
                  if (preset?.helpText) {
                    return (
                      <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl flex items-start gap-2 text-sm">
                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{preset.helpText}</p>
                          {preset.helpLink && (
                            <a href={preset.helpLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mt-1 inline-block text-xs">
                              Generate App Password →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">IMAP Host</Label>
                    <Input required name="imapHost" value={formData.imapHost || ''} onChange={handleChangeText} placeholder="imap.gmail.com" className="h-10 text-[15px]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">Port</Label>
                    <Input required type="number" name="imapPort" value={formData.imapPort || ''} onChange={handleChangeText} className="h-10 text-[15px]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">Username</Label>
                    <Input required name="imapUser" value={formData.imapUser || ''} onChange={handleChangeText} className="h-10 text-[15px]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">
                      Password {selectedProfile && <span className="text-slate-400 font-normal">(leave blank to keep)</span>}
                    </Label>
                    <Input required={!selectedProfile} type="password" name="imapPassword" value={formData.imapPassword || ''} onChange={handleChangeText} className="h-10 text-[15px]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">Mail Domain</Label>
                    <Input required name="mailDomain" value={formData.mailDomain || ''} onChange={handleChangeText} placeholder="example.com" className="h-10 text-[15px]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">Base Address</Label>
                    <Input required name="mailBaseAddress" value={formData.mailBaseAddress || ''} onChange={handleChangeText} placeholder="inbox" className="h-10 text-[15px]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium text-slate-500">Sync Mode</Label>
                    <Select value={formData.imapMode} onValueChange={(val) => setFormData(prev => ({ ...prev, imapMode: val || 'idle' }))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idle">Real-time (IDLE)</SelectItem>
                        <SelectItem value="poll">Polling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.imapMode === 'poll' && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium text-slate-500">Poll Interval (ms)</Label>
                      <Input required type="number" min="1000" name="imapPollInterval" value={formData.imapPollInterval || 5000} onChange={handleChangeText} className="h-10 text-[15px]" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="tls"
                    checked={formData.imapTls}
                    onCheckedChange={(c) => setFormData(p => ({ ...p, imapTls: c as boolean }))}
                    className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label htmlFor="tls" className="text-[15px] text-slate-600 font-normal cursor-pointer">Enable TLS / SSL</Label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setError(null); }}
                    className="flex items-center justify-center h-9 px-4 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-1.5 h-9 px-4 min-w-[120px] text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 shadow-sm"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Profile</>}
                  </button>
                </div>
              </form>
            </div>

          ) : (
            /* ── Empty State ── */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Server size={28} className="text-slate-300" />
              </div>
              <p className="text-sm">Select a profile or create a new one</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

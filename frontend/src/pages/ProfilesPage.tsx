import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Server, Check, Trash2, Edit2, Loader2, Save, AlertCircle, Download, Upload, FileJson } from 'lucide-react';
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
  
  // Form State
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
    setFormData({ ...p, imapPassword: '' }); // clear password for editing
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
    <div className="setup-container flex items-center justify-center p-4">
      <div className="bg-slate-900 border-4 border-black shadow-[8px_8px_0_#000] flex w-full max-w-5xl h-[80vh] overflow-hidden text-slate-200">
        
        {/* Left Sidebar: Profile List */}
        <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-950">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-200 flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
            <Button size="sm" onClick={handleAddNew} className="bg-green-500 hover:bg-green-400 text-black border-2 border-black shadow-[2px_2px_0_#000] rounded-none hover:translate-x-[-1px] hover:translate-y-[-1px] font-bold gap-2">
              <Plus size={14} /> New Profile
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="text-center p-4 text-slate-500 text-sm">Loading...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center p-4 text-slate-500 text-sm">No profiles found</div>
            ) : (
              profiles.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`p-3 border-2 cursor-pointer transition-all ${selectedProfile?.id === p.id && !isEditing ? 'border-black bg-green-500 text-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]' : 'border-transparent hover:border-black hover:bg-slate-800'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium heading-font text-[10px] ${selectedProfile?.id === p.id && !isEditing ? 'text-black' : 'text-slate-200'}`}>{p.name}</span>
                    {p.isActive && <span className="bg-black text-green-400 text-[10px] px-2 py-0.5 border border-green-400 font-medium tracking-wide">ACTIVE</span>}
                  </div>
                  <div className={`text-xs flex items-center gap-1.5 ${selectedProfile?.id === p.id && !isEditing ? 'text-slate-800' : 'text-slate-400'}`}><Server size={12} /> {p.imapUser}</div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 border-2 border-black rounded-none shadow-[2px_2px_0_#000] bg-slate-800 hover:bg-slate-700 text-slate-300 gap-2">
              <Upload size={14} /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTemplate} className="flex-1 border-2 border-black rounded-none shadow-[2px_2px_0_#000] bg-slate-800 hover:bg-slate-700 text-slate-300 gap-2">
              <FileJson size={14} /> Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 border-2 border-black rounded-none shadow-[2px_2px_0_#000] bg-slate-800 hover:bg-slate-700 text-slate-300 gap-2" disabled={profiles.length === 0}>
              <Download size={14} /> Export
            </Button>
          </div>
        </div>

        {/* Right Content */}
        <div className="w-2/3 flex flex-col bg-slate-900 overflow-y-auto">
          {error && (
            <div className="m-6 mb-0 p-3 bg-red-500 border-2 border-black shadow-[4px_4px_0_#000] text-black font-bold flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!isEditing && selectedProfile ? (
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-xl font-semibold mb-2 heading-font">{selectedProfile.name}</h2>
                  <p className="text-slate-400 text-sm flex items-center gap-2"><Server size={14}/> {selectedProfile.imapUser} @ {selectedProfile.imapHost}:{selectedProfile.imapPort}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(selectedProfile)} className="border-2 border-black shadow-[2px_2px_0_#000] rounded-none bg-slate-800 hover:bg-slate-700 gap-2">
                    <Edit2 size={14} /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(selectedProfile.id)} className="border-2 border-black shadow-[2px_2px_0_#000] rounded-none bg-red-500 text-black hover:bg-red-400 hover:text-black gap-2">
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-900 p-6 border-2 border-black shadow-[6px_6px_0_#000]">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Connection</span>
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    <p><span className="text-slate-500 inline-block w-20">Host</span> {selectedProfile.imapHost}</p>
                    <p><span className="text-slate-500 inline-block w-20">Port</span> {selectedProfile.imapPort}</p>
                    <p><span className="text-slate-500 inline-block w-20">TLS</span> {selectedProfile.imapTls ? 'Enabled' : 'Disabled'}</p>
                    <p><span className="text-slate-500 inline-block w-20">Mode</span> {selectedProfile.imapMode === 'idle' ? 'IDLE (Real-time)' : 'Polling'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Rules</span>
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    <p><span className="text-slate-500 inline-block w-24">Domain</span> {selectedProfile.mailDomain}</p>
                    <p><span className="text-slate-500 inline-block w-24">Base Addr</span> {selectedProfile.mailBaseAddress}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-800 flex justify-end">
                <Button 
                  onClick={() => handleActivate(selectedProfile.id)}
                  disabled={selectedProfile.isActive}
                  className={selectedProfile.isActive ? "bg-slate-800 text-slate-500" : "bg-emerald-600 hover:bg-emerald-500 text-white"}
                >
                  {selectedProfile.isActive ? <><Check size={16} className="mr-2"/> Active Profile</> : 'Set as Active Profile'}
                </Button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                {selectedProfile ? 'Edit Profile' : 'Create New Profile'}
              </h2>
              
              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 mt-2">
                    <Label className="text-xs font-medium text-slate-400">Profile Name</Label>
                    <Input required name="name" value={formData.name || ''} onChange={handleChangeText} placeholder="e.g. Work Gmail" className="bg-slate-950 border-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <Label className="text-xs font-medium text-slate-400">Email Provider</Label>
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
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        {PROVIDER_PRESETS.map(p => (
                          <SelectItem key={p.id} value={p.id} disabled={p.id !== 'custom'} className="text-slate-200">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(() => {
                  const preset = PROVIDER_PRESETS.find(p => p.id === formData.provider);
                  if (preset && preset.helpText) {
                    return (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg flex items-start gap-2 text-sm">
                        <AlertCircle size={16} className="mt-0.5" />
                        <div>
                          <p>{preset.helpText}</p>
                          {preset.helpLink && (
                            <a href={preset.helpLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-1 inline-block">
                              Generate App Password
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
                    <Label className="text-xs font-medium text-slate-400">IMAP Host</Label>
                    <Input required name="imapHost" value={formData.imapHost || ''} onChange={handleChangeText} placeholder="imap.gmail.com" className="bg-slate-950 border-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-400">Port</Label>
                    <Input required type="number" name="imapPort" value={formData.imapPort || ''} onChange={handleChangeText} className="bg-slate-950 border-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-400">Username</Label>
                    <Input required name="imapUser" value={formData.imapUser || ''} onChange={handleChangeText} className="bg-slate-950 border-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-400">Password {selectedProfile && '(Leave blank to keep)'}</Label>
                    <Input required={!selectedProfile} type="password" name="imapPassword" value={formData.imapPassword || ''} onChange={handleChangeText} className="bg-slate-950 border-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-400">Mail Domain</Label>
                    <Input required name="mailDomain" value={formData.mailDomain || ''} onChange={handleChangeText} placeholder="example.com" className="bg-slate-950 border-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-400">Base Address</Label>
                    <Input required name="mailBaseAddress" value={formData.mailBaseAddress || ''} onChange={handleChangeText} placeholder="inbox" className="bg-slate-950 border-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-slate-400">Sync Mode</Label>
                    <Select value={formData.imapMode} onValueChange={(val) => setFormData(prev => ({ ...prev, imapMode: val || 'idle' }))}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="idle" className="text-slate-200">Real-time (IDLE)</SelectItem>
                        <SelectItem value="poll" className="text-slate-200">Polling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.imapMode === 'poll' && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-medium text-slate-400">Poll Interval (ms)</Label>
                      <Input required type="number" min="1000" name="imapPollInterval" value={formData.imapPollInterval || 5000} onChange={handleChangeText} className="bg-slate-950 border-slate-800" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Checkbox
                    id="tls"
                    checked={formData.imapTls}
                    onCheckedChange={(c) => setFormData(p => ({ ...p, imapTls: c as boolean }))}
                    className="border-slate-600 data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="tls" className="text-sm font-normal text-slate-300">Enable TLS/SSL</Label>
                </div>

                <div className="flex items-center justify-end gap-3 mt-4 pt-6 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); setError(null); }} className="text-slate-400 hover:text-slate-200">Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white min-w-[120px]">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} className="mr-2" /> Save Profile</>}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
              <Server size={48} className="mb-4 opacity-20" />
              <p>Select a profile from the left or create a new one.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

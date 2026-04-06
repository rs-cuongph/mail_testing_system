import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { profilesApi } from '../services/profiles.api';
import type { ImapProfile } from '../services/profiles.api';
import { useProfile } from '../contexts/ProfileContext';
import { Loader2 } from 'lucide-react';

export function ProfileSwitcher() {
  const { activeProfileId, setActiveProfileId } = useProfile();
  const [profiles, setProfiles] = useState<ImapProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await profilesApi.getProfiles();
        setProfiles(data);
        const active = data.find(p => p.isActive);
        if (active && active.id !== activeProfileId) {
          setActiveProfileId(active.id);
        }
      } catch (err) {
        console.error('Failed to fetch profiles', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();

    const handleProfileSwitched = () => fetchProfiles();
    window.addEventListener('profile:switched', handleProfileSwitched);
    return () => window.removeEventListener('profile:switched', handleProfileSwitched);
  }, [activeProfileId, setActiveProfileId]);

  const handleSwitch = async (id: string | null) => {
    if (!id) return;
    try {
      setLoading(true);
      await profilesApi.activateProfile(id);
      setActiveProfileId(id);
      // Wait for backend to finish bouncing and then it'll be fine
    } catch (err) {
      console.error('Failed to switch profile', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex items-center w-[200px] h-[34px] border-2 border-black px-3 bg-slate-900 shadow-[2px_2px_0_#000] text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden w-[200px] flex items-center">
      <Select name="profile-switcher-input" value={activeProfileId || ''} onValueChange={handleSwitch} disabled={loading}>
        <SelectTrigger className="w-full bg-slate-900 border-2 border-black rounded-none shadow-[2px_2px_0_#000] text-sm focus:ring-0">
          <SelectValue placeholder="Select Profile">
            {profiles.find(p => p.id === activeProfileId)?.name || 'Select Profile'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-2 border-black rounded-none shadow-[4px_4px_0_#000]">
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id} className="text-slate-200 rounded-none focus:bg-accent focus:text-black">
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

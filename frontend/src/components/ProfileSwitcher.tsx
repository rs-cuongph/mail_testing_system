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
      <div className="flex items-center gap-1.5 px-3 h-8 min-w-[120px] rounded-[var(--radius-sm)] bg-transparent border border-[var(--border-custom)] text-[var(--text-muted)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[13px] font-medium">Loading...</span>
      </div>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  return (
    <div className="relative flex items-center">
      <Select name="profile-switcher-input" value={activeProfileId || ''} onValueChange={handleSwitch} disabled={loading}>
        <SelectTrigger className="w-[140px] h-8 text-[13px] font-medium">
          <SelectValue placeholder="Select Profile">
            {profiles.find(p => p.id === activeProfileId)?.name || 'Select Profile'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id} className="text-[13px] font-medium">
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

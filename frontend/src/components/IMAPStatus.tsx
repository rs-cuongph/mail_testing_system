import { useEffect, useState } from 'react';
import { settingsApi } from '../services/settings.api';
import type { SettingsStatus } from '../services/settings.api';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { onSocketEvent } from '../services/socket';
import { traceError } from '../services/trace';

export function IMAPStatus() {
  const [status, setStatus] = useState<SettingsStatus>({ status: 'disconnected' });
  const [loading, setLoading] = useState(true);

  // Poll status every 10 seconds as a fallback, but rely mostly on websocket
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await settingsApi.getStatus();
        setStatus(data);
      } catch (err) {
        traceError('app', 'Failed to fetch IMAP status', err);
        setStatus({ status: 'error', error: 'Failed to fetch status' });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    const cleanupSocket = onSocketEvent<SettingsStatus>('imap.status', (newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      clearInterval(interval);
      cleanupSocket();
    };
  }, []);

  if (loading) return <div className="status-indicator">Loading status...</div>;

  const getStatusStyles = () => {
    switch (status.status) {
      case 'connected': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'disconnected': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'connecting': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const renderStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'disconnected':
        return <XCircle size={14} className="text-slate-400" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'connecting':
      default:
        return <RefreshCw size={14} className="text-amber-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'IMAP Error';
      case 'connecting': return 'Connecting...';
      default: return 'Unknown';
    }
  };

  return (
    <div 
      className={`status-indicator flex items-center gap-1.5 text-[13px] font-medium px-2.5 h-8 rounded-lg border transition-colors ${getStatusStyles()}`}
      style={{ cursor: status.error ? 'help' : 'default' }}
      title={status.error || 'IMAP connection status'}
    >
      {renderStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}

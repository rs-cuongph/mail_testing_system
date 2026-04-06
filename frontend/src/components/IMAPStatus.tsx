import { useEffect, useState } from 'react';
import { settingsApi } from '../services/settings.api';
import type { SettingsStatus } from '../services/settings.api';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getSocket } from '../services/socket';

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
        setStatus({ status: 'error', error: 'Failed to fetch status' });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);

    const socket = getSocket();

    // Socket listener for real-time status updates
    socket.on('imap.status', (newStatus: SettingsStatus) => {
      setStatus(newStatus);
    });

    return () => {
      clearInterval(interval);
      socket.off('imap.status');
    };
  }, []);

  if (loading) return <div className="status-indicator">Loading status...</div>;

  const renderStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'disconnected':
        return <XCircle size={16} style={{ color: '#64748b' }} />;
      case 'error':
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      case 'connecting':
      default:
        return <RefreshCw size={16} className="animate-spin" style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />;
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
      className="status-indicator" 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        fontSize: '0.875rem', 
        color: '#cbd5e1',
        background: 'rgba(30, 41, 59, 0.5)',
        padding: '4px 8px',
        borderRadius: '6px',
        cursor: status.error ? 'help' : 'default'
      }}
      title={status.error || 'IMAP connection status'}
    >
      {renderStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}

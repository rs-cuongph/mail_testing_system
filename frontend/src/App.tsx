import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { EmailDetail } from './components/EmailDetail';
import { SearchResults } from './components/SearchResults';
import { TracePanel } from './components/TracePanel';
import { type AppConfig } from './services/api';
import { AlertTriangle, Bell, BellOff, Bug, Mailbox, Settings, X } from 'lucide-react';
import { SetupPage } from './pages/SetupPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { IMAPStatus } from './components/IMAPStatus';
import { ProfileProvider } from './contexts/ProfileContext';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { getDesktopNotificationsEnabled, isDesktopNotificationsSupported, onDesktopNotificationClick, setDesktopNotificationsEnabled, showDesktopNotification } from './services/desktop';
import { onSocketEvent } from './services/socket';
import { getTraceEntries, getUnviewedErrorCount, subscribeTraceEntries, subscribeTraceMeta, type TraceEntry } from './services/trace';
import './index.css';

const logoUrl = `${import.meta.env.BASE_URL}mail-catcher.svg`;

function MainApp() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState<AppConfig>({ mailDomain: '...', mailBaseAddress: '...' });
  const [profileState, setProfileState] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [tracePanelOpen, setTracePanelOpen] = useState(false);
  const [unviewedErrorCount, setUnviewedErrorCount] = useState(0);
  const [toastEntry, setToastEntry] = useState<TraceEntry | null>(null);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const navigate = useNavigate();
  const selectedTagRef = useRef<string | null>(selectedTag);
  const selectedEmailIdRef = useRef<string | null>(selectedEmailId);
  const notificationBatchRef = useRef<{
    timer: number | null;
    items: Array<{
      threadTag: string;
      threadFullAddress: string;
      emailId: string;
      fromEmail: string;
      subject: string;
    }>;
  }>({
    timer: null,
    items: [],
  });

  useEffect(() => {
    selectedTagRef.current = selectedTag;
  }, [selectedTag]);

  useEffect(() => {
    selectedEmailIdRef.current = selectedEmailId;
  }, [selectedEmailId]);

  useEffect(() => {
    let lastSeenErrorId: string | null = getLatestErrorId(getTraceEntries());

    const updateErrorCount = () => {
      setUnviewedErrorCount(getUnviewedErrorCount());
    };

    updateErrorCount();
    const unsubscribeEntries = subscribeTraceEntries((entries) => {
      updateErrorCount();

      const latestError = [...entries].reverse().find((entry) => entry.level === 'error');
      if (!latestError || latestError.id === lastSeenErrorId) {
        return;
      }

      lastSeenErrorId = latestError.id;
      setToastEntry(latestError);

      if (shouldAutoOpenTracePanel(latestError)) {
        setTracePanelOpen(true);
      }
    });
    const unsubscribeMeta = subscribeTraceMeta(() => updateErrorCount());

    return () => {
      unsubscribeEntries();
      unsubscribeMeta();
    };
  }, []);

  useEffect(() => {
    const loadActiveProfile = () => {
      const storedProfileId = window.localStorage.getItem('activeProfileId');
      if (!storedProfileId) {
        setProfileState('missing');
        navigate('/setup');
        return;
      }

      import('./services/profiles.api').then(({ profilesApi }) => {
        profilesApi.getActiveProfile()
          .then((settings) => {
            setConfig({ mailDomain: settings.mailDomain, mailBaseAddress: settings.mailBaseAddress });
            setProfileState('ready');
          })
          .catch((err) => {
            if (err.message === 'Request failed' || err.message?.includes('404')) {
              setProfileState('missing');
              navigate('/setup');
            } else {
              setConfig({ mailDomain: 'runsystem.work', mailBaseAddress: 'gens' });
              setProfileState('ready');
            }
          });
      });
    };

    loadActiveProfile();

    const handleProfileSwitched = () => {
      setProfileState('checking');
      loadActiveProfile();
    };

    window.addEventListener('profile:switched', handleProfileSwitched);
    return () => window.removeEventListener('profile:switched', handleProfileSwitched);
  }, [navigate]);

  useEffect(() => {
    const cleanupNotificationClick = onDesktopNotificationClick((payload) => {
      setTracePanelOpen(false);
      setSearchQuery('');

      if (payload.threadTag) {
        setSelectedTag(payload.threadTag);
      }

      if (payload.emailId) {
        setSelectedEmailId(payload.emailId);
      } else {
        setSelectedEmailId(null);
      }
    });

    return () => {
      cleanupNotificationClick();
    };
  }, []);

  useEffect(() => {
    void isDesktopNotificationsSupported().then(setNotificationsSupported);
    void getDesktopNotificationsEnabled().then(setNotificationsEnabled);
  }, []);

  useEffect(() => {
    if (profileState !== 'ready') {
      return;
    }

    const cleanupEmailNewNotification = onSocketEvent<{
      threadTag: string;
      threadFullAddress: string;
      email: {
        id: string;
        fromEmail: string;
        subject: string | null;
      };
    }>('email:new', (payload) => {
      if (!notificationsEnabled) {
        return;
      }

      const subject = payload.email.subject?.trim() || '(no subject)';

      if (shouldSuppressNotification(payload.threadTag, payload.email.id, selectedTagRef.current, selectedEmailIdRef.current)) {
        return;
      }

      notificationBatchRef.current.items.push({
        threadTag: payload.threadTag,
        threadFullAddress: payload.threadFullAddress,
        emailId: payload.email.id,
        fromEmail: payload.email.fromEmail,
        subject,
      });

      if (notificationBatchRef.current.timer !== null) {
        return;
      }

      notificationBatchRef.current.timer = window.setTimeout(() => {
        const batch = notificationBatchRef.current.items.splice(0);
        notificationBatchRef.current.timer = null;

        if (batch.length === 0) {
          return;
        }

        if (batch.length === 1) {
          const [item] = batch;
          void showDesktopNotification({
            title: `New mail for ${item.threadTag}`,
            body: `${item.fromEmail}\n${item.subject}`,
            threadTag: item.threadTag,
            emailId: item.emailId,
          });
          return;
        }

        const uniqueThreads = [...new Set(batch.map((item) => item.threadTag))];
        const latest = batch[batch.length - 1];
        void showDesktopNotification({
          title: `${batch.length} new emails`,
          body:
            uniqueThreads.length === 1
              ? `Latest from ${latest.fromEmail}\n${latest.subject}`
              : `${uniqueThreads.length} threads updated\nLatest: ${latest.threadTag}`,
          threadTag: uniqueThreads.length === 1 ? latest.threadTag : undefined,
          emailId: uniqueThreads.length === 1 ? latest.emailId : undefined,
        });
      }, 2500);
    });

    return () => {
      if (notificationBatchRef.current.timer !== null) {
        window.clearTimeout(notificationBatchRef.current.timer);
        notificationBatchRef.current.timer = null;
        notificationBatchRef.current.items = [];
      }
      cleanupEmailNewNotification();
    };
  }, [notificationsEnabled, profileState]);

  const handleSelectThread = (tag: string) => {
    setSelectedTag(tag);
    setSelectedEmailId(null);
    setSearchQuery('');
  };

  const handleSelectSearchResult = (tag: string, emailId: string) => {
    setSearchQuery('');
    setSelectedTag(tag);
    setSelectedEmailId(emailId);
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
  };

  const handleCloseEmail = () => {
    setSelectedEmailId(null);
  };

  const handleToggleNotifications = async () => {
    const next = await setDesktopNotificationsEnabled(!notificationsEnabled);
    setNotificationsEnabled(next);
  };

  const exampleAddress = `${config.mailBaseAddress}+tag@${config.mailDomain}`;

  if (profileState === 'checking') {
    return <TracePanel open={tracePanelOpen} onClose={() => setTracePanelOpen(false)} />;
  }

  if (profileState === 'missing') {
    return <TracePanel open={tracePanelOpen} onClose={() => setTracePanelOpen(false)} />;
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo" style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logoUrl} alt="Mail Catcher" width="48" height="48" style={{ marginRight: '8px', objectFit: 'contain' }} />
            Mail Catcher
          </div>
        </div>
        <div className="app-header-actions">
          <IMAPStatus />
          <ProfileSwitcher />
          <Link to="/profiles" className="btn-secondary-sm" style={{ textDecoration: 'none' }}>
            <Settings size={14} /> Profiles
          </Link>
        </div>
        <div className="app-header-trace">
          {notificationsSupported && (
            <button
              className={`btn-icon header-icon-button notification-toggle-button ${notificationsEnabled ? 'notification-toggle-active' : ''}`}
              onClick={() => void handleToggleNotifications()}
              title={notificationsEnabled ? 'Disable desktop notifications' : 'Enable desktop notifications'}
              aria-label={notificationsEnabled ? 'Disable desktop notifications' : 'Enable desktop notifications'}
            >
              {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
            </button>
          )}
          <button
            className={`btn-icon header-icon-button trace-toggle-button ${tracePanelOpen ? 'trace-toggle-active' : ''}`}
            onClick={() => setTracePanelOpen((value) => !value)}
            title="Open trace log"
            aria-label="Open trace log"
          >
            <Bug size={16} />
            {unviewedErrorCount > 0 && <span className="trace-unviewed-badge">{unviewedErrorCount > 99 ? '99+' : unviewedErrorCount}</span>}
          </button>
        </div>
      </header>

      <div className="app-body">
        <ThreadList
          selectedTag={selectedTag}
          onSelectThread={handleSelectThread}
          config={config}
          onSearch={setSearchQuery}
        />

        <main className="main-panel">
          {searchQuery && (
            <SearchResults
              query={searchQuery}
              onSelectResult={handleSelectSearchResult}
            />
          )}

          {!searchQuery && !selectedTag && (
            <div className="empty-state">
              <Mailbox size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <h2>Select a thread</h2>
              <p>Send emails to <code>{exampleAddress}</code> to see them grouped here.</p>
            </div>
          )}

          {!searchQuery && selectedTag && !selectedEmailId && (
            <ThreadView
              tag={selectedTag}
              onSelectEmail={handleSelectEmail}
              selectedEmailId={selectedEmailId}
            />
          )}

          {!searchQuery && selectedTag && selectedEmailId && (
            <EmailDetail
              emailId={selectedEmailId}
              onClose={handleCloseEmail}
            />
          )}
        </main>
      </div>

      {toastEntry && (
        <div className="trace-toast" role="status" aria-live="polite">
          <div className="trace-toast-icon">
            <AlertTriangle size={16} />
          </div>
          <div className="trace-toast-body">
            <div className="trace-toast-title">
              New {toastEntry.source} error
              {toastEntry.eventName && <span className="trace-toast-event">{toastEntry.eventName}</span>}
            </div>
            <div className="trace-toast-message">{toastEntry.message}</div>
          </div>
          <div className="trace-toast-actions">
            <button className="btn-secondary-sm" onClick={() => setTracePanelOpen(true)}>
              Open Trace
            </button>
            <button className="btn-icon" onClick={() => setToastEntry(null)} title="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <TracePanel open={tracePanelOpen} onClose={() => setTracePanelOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    </ProfileProvider>
  );
}

function getLatestErrorId(entries: TraceEntry[]) {
  const latestError = [...entries].reverse().find((entry) => entry.level === 'error');
  return latestError?.id ?? null;
}

function shouldAutoOpenTracePanel(entry: TraceEntry) {
  return (
    entry.source === 'window' ||
    entry.eventName === 'connect_error' ||
    entry.eventName === 'reconnect_error'
  );
}

function shouldSuppressNotification(
  threadTag: string,
  emailId: string,
  selectedTag: string | null,
  selectedEmailId: string | null,
) {
  return document.hasFocus() && selectedTag === threadTag && (selectedEmailId === null || selectedEmailId === emailId);
}

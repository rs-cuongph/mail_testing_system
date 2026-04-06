import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { EmailDetail } from './components/EmailDetail';
import { SearchResults } from './components/SearchResults';
import { type AppConfig } from './services/api';
import { settingsApi } from './services/settings.api';
import { Inbox, Mailbox, Settings } from 'lucide-react';
import { SetupPage } from './pages/SetupPage';
import { SettingsPage } from './pages/SettingsPage';
import { IMAPStatus } from './components/IMAPStatus';
import './index.css';

function MainApp() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState<AppConfig>({ mailDomain: '...', mailBaseAddress: '...' });
  const navigate = useNavigate();

  useEffect(() => {
    // Both config load and setup check
    settingsApi.getSettings()
      .then((settings) => {
        // AppConfig expects mailDomain and mailBaseAddress
        setConfig({ mailDomain: settings.mailDomain, mailBaseAddress: settings.mailBaseAddress });
      })
      .catch((err) => {
        if (err.message === 'Request failed' || err.message?.includes('404')) {
          navigate('/setup');
        } else {
          setConfig({ mailDomain: 'rn.work', mailBaseAddress: 'gens' });
        }
      });
  }, [navigate]);

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

  const exampleAddress = `${config.mailBaseAddress}+tag@${config.mailDomain}`;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-logo"><Inbox size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} /> Mail Testing System</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <IMAPStatus />
          <div className="app-subtitle" style={{ margin: '0 8px' }}>Plus Addressing Thread View</div>
          <Link to="/settings" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px', transition: 'background 0.2s' }} className="settings-link">
            <Settings size={20} />
          </Link>
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
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

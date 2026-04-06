import { useEffect, useState } from 'react';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { EmailDetail } from './components/EmailDetail';
import { SearchResults } from './components/SearchResults';
import { api, type AppConfig } from './services/api';
import { Inbox, Mailbox } from 'lucide-react';
import './index.css';

export default function App() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState<AppConfig>({ mailDomain: '...', mailBaseAddress: '...' });

  useEffect(() => {
    api.getConfig()
      .then(setConfig)
      .catch(() => setConfig({ mailDomain: 'rn.work', mailBaseAddress: 'gens' }));
  }, []);

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
        <div className="app-subtitle">Plus Addressing Thread View</div>
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

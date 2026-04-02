import { useState } from 'react';
import { ThreadList } from './components/ThreadList';
import { ThreadView } from './components/ThreadView';
import { EmailDetail } from './components/EmailDetail';
import './index.css';

export default function App() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const handleSelectThread = (tag: string) => {
    setSelectedTag(tag);
    setSelectedEmailId(null);
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
  };

  const handleCloseEmail = () => {
    setSelectedEmailId(null);
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-logo">📬 Mail Testing System</div>
        <div className="app-subtitle">Plus Addressing Thread View</div>
      </header>

      <div className="app-body">
        <ThreadList
          selectedTag={selectedTag}
          onSelectThread={handleSelectThread}
        />

        <main className="main-panel">
          {!selectedTag && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h2>Select a thread</h2>
              <p>Send emails to <code>gens+tag@rn.work</code> to see them grouped here.</p>
            </div>
          )}

          {selectedTag && !selectedEmailId && (
            <ThreadView
              tag={selectedTag}
              onSelectEmail={handleSelectEmail}
              selectedEmailId={selectedEmailId}
            />
          )}

          {selectedTag && selectedEmailId && (
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

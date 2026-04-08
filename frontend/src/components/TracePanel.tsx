import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertCircle, Bug, ChevronDown, ChevronUp, Copy, Download, Filter, Info, Trash2, TriangleAlert, X } from 'lucide-react';
import { clearTraceEntries, exportTraceLog, markTraceViewed, subscribeTraceEntries, type TraceEntry } from '../services/trace';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TraceFilter = 'all' | 'error' | 'warn' | 'info';
type TraceSourceFilter = 'all' | 'socket' | 'http' | 'window' | 'console' | 'app';

type GroupedTraceEntry = {
  fingerprint: string;
  count: number;
  latest: TraceEntry;
  firstTimestamp: string;
  entries: TraceEntry[];
};

export function TracePanel({ open, onClose }: Props) {
  const [entries, setEntries] = useState<TraceEntry[]>([]);
  const [filter, setFilter] = useState<TraceFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<TraceSourceFilter>('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [groupDuplicates, setGroupDuplicates] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => subscribeTraceEntries(setEntries), []);
  useEffect(() => {
    if (open) {
      markTraceViewed();
    }
  }, [open]);

  const availableEvents = useMemo(() => {
    return [...new Set(entries.filter((entry) => entry.source === 'socket' && entry.eventName).map((entry) => entry.eventName as string))]
      .sort((left, right) => left.localeCompare(right));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...entries]
      .reverse()
      .filter((entry) => filter === 'all' || entry.level === filter)
      .filter((entry) => sourceFilter === 'all' || entry.source === sourceFilter)
      .filter((entry) => eventFilter === 'all' || entry.eventName === eventFilter)
      .filter((entry) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          entry.message,
          entry.source,
          entry.eventName ?? '',
          entry.error ? JSON.stringify(entry.error) : '',
          entry.context ? JSON.stringify(entry.context) : '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      });
  }, [entries, eventFilter, filter, search, sourceFilter]);

  const displayedEntries = useMemo(() => {
    if (!groupDuplicates) {
      return filteredEntries.map((entry) => ({
        fingerprint: entry.id,
        count: 1,
        latest: entry,
        firstTimestamp: entry.timestamp,
        entries: [entry],
      }));
    }

    const groups = new Map<string, GroupedTraceEntry>();

    for (const entry of filteredEntries) {
      const fingerprint = createFingerprint(entry);
      const existing = groups.get(fingerprint);

      if (existing) {
        existing.count += 1;
        existing.entries.push(entry);
      } else {
        groups.set(fingerprint, {
          fingerprint,
          count: 1,
          latest: entry,
          firstTimestamp: entry.timestamp,
          entries: [entry],
        });
      }
    }

    return [...groups.values()];
  }, [filteredEntries, groupDuplicates]);

  const stats = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc[entry.level] += 1;
        return acc;
      },
      { error: 0, warn: 0, info: 0 },
    );
  }, [entries]);

  return (
    <>
      {open && <div className="trace-backdrop" onClick={onClose} />}
      <aside className={`trace-panel ${open ? 'open' : ''}`}>
        <div className="trace-panel-header">
          <div>
            <div className="trace-panel-kicker">Runtime Trace</div>
            <h3>Client Logs</h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close trace panel">
            <X size={16} />
          </button>
        </div>

        <div className="trace-summary-grid">
          <div className="trace-summary-card">
            <TriangleAlert size={15} />
            <span>{stats.error} errors</span>
          </div>
          <div className="trace-summary-card">
            <AlertCircle size={15} />
            <span>{stats.warn} warnings</span>
          </div>
          <div className="trace-summary-card">
            <Info size={15} />
            <span>{stats.info} info</span>
          </div>
        </div>

        <div className="trace-toolbar">
          <div className="trace-filter-group">
            <Filter size={14} />
            <button className={`trace-filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`trace-filter-chip ${filter === 'error' ? 'active' : ''}`} onClick={() => setFilter('error')}>Errors</button>
            <button className={`trace-filter-chip ${filter === 'warn' ? 'active' : ''}`} onClick={() => setFilter('warn')}>Warn</button>
            <button className={`trace-filter-chip ${filter === 'info' ? 'active' : ''}`} onClick={() => setFilter('info')}>Info</button>
          </div>
          <div className="trace-filter-group">
            <span className="trace-filter-label">Source</span>
            <button className={`trace-filter-chip ${sourceFilter === 'all' ? 'active' : ''}`} onClick={() => setSourceFilter('all')}>All</button>
            <button className={`trace-filter-chip ${sourceFilter === 'socket' ? 'active' : ''}`} onClick={() => setSourceFilter('socket')}>Socket</button>
            <button className={`trace-filter-chip ${sourceFilter === 'http' ? 'active' : ''}`} onClick={() => setSourceFilter('http')}>HTTP</button>
            <button className={`trace-filter-chip ${sourceFilter === 'window' ? 'active' : ''}`} onClick={() => setSourceFilter('window')}>Window</button>
            <button className={`trace-filter-chip ${sourceFilter === 'console' ? 'active' : ''}`} onClick={() => setSourceFilter('console')}>Console</button>
            <button className={`trace-filter-chip ${sourceFilter === 'app' ? 'active' : ''}`} onClick={() => setSourceFilter('app')}>App</button>
          </div>
          <div className="trace-filter-group">
            <span className="trace-filter-label">View</span>
            <button className={`trace-filter-chip ${groupDuplicates ? 'active' : ''}`} onClick={() => setGroupDuplicates(true)}>Grouped</button>
            <button className={`trace-filter-chip ${!groupDuplicates ? 'active' : ''}`} onClick={() => setGroupDuplicates(false)}>Raw</button>
          </div>
          {sourceFilter === 'socket' && availableEvents.length > 0 && (
            <div className="trace-filter-group">
              <span className="trace-filter-label">Event</span>
              <button className={`trace-filter-chip ${eventFilter === 'all' ? 'active' : ''}`} onClick={() => setEventFilter('all')}>All</button>
              {availableEvents.map((eventName) => (
                <button
                  key={eventName}
                  className={`trace-filter-chip ${eventFilter === eventName ? 'active' : ''}`}
                  onClick={() => setEventFilter(eventName)}
                >
                  {eventName}
                </button>
              ))}
            </div>
          )}
          <input
            className="trace-search-input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search message, source, payload, stack..."
          />
          <div className="trace-actions">
            <button className="btn-secondary-sm" onClick={exportTraceLog}>
              <Download size={14} /> Export
            </button>
            <button className="btn-danger-sm" onClick={clearTraceEntries}>
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        <div className="trace-list">
          {displayedEntries.length === 0 && (
            <div className="trace-empty-state">
              <Bug size={18} />
              <span>No trace entries</span>
            </div>
          )}

          {displayedEntries.map((group) => {
            const entry = group.latest;
            const expanded = expandedId === group.fingerprint;
            return (
              <article key={entry.id} className={`trace-entry trace-${entry.level}`}>
                <button
                  className="trace-entry-head"
                  onClick={() => setExpandedId(expanded ? null : group.fingerprint)}
                >
                  <div className="trace-entry-main">
                    <span className={`trace-level-pill trace-level-${entry.level}`}>{entry.level}</span>
                    <span className={`trace-source-pill trace-source-${entry.source}`}>{entry.source}</span>
                    {entry.eventName && <span className="trace-event-pill">{entry.eventName}</span>}
                    <div className="trace-message">{entry.message}</div>
                    {group.count > 1 && <span className="trace-count-badge">{group.count}x</span>}
                  </div>
                  <div className="trace-entry-meta">
                    {group.count > 1 && <span>{formatTimestamp(group.firstTimestamp)} to {formatTimestamp(entry.timestamp)}</span>}
                    {group.count === 1 && <time>{formatTimestamp(entry.timestamp)}</time>}
                    <button
                      type="button"
                      className="trace-copy-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCopyGroup(group, setCopiedId);
                      }}
                      title="Copy trace entry"
                    >
                      <Copy size={13} />
                      {copiedId === group.fingerprint ? 'Copied' : 'Copy'}
                    </button>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {expanded && (
                  <div className="trace-entry-body">
                    {group.count > 1 && (
                      <section className="trace-group-summary">
                        <span>Occurrences: {group.count}</span>
                        <span>First seen: {formatTimestamp(group.firstTimestamp)}</span>
                        <span>Last seen: {formatTimestamp(entry.timestamp)}</span>
                        {entry.eventName && <span>Event: {entry.eventName}</span>}
                      </section>
                    )}
                    {entry.eventName && (
                      <section className="trace-detail-block">
                        <h4>Event</h4>
                        <pre>{entry.eventName}</pre>
                      </section>
                    )}
                    {entry.error !== undefined && (
                      <section className="trace-detail-block">
                        <h4>Error</h4>
                        <pre>{formatTraceDetail(entry.error)}</pre>
                      </section>
                    )}
                    {entry.context !== undefined && (
                      <section className="trace-detail-block">
                        <h4>Context</h4>
                        <pre>{formatTraceDetail(entry.context)}</pre>
                      </section>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </aside>
    </>
  );
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTraceDetail(value: unknown) {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? String(value);
}

function createFingerprint(entry: TraceEntry) {
  return [
    entry.level,
    entry.source,
    entry.eventName ?? '',
    entry.message,
    entry.error?.name ?? '',
    entry.error?.message ?? '',
    entry.context ? stableStringify(entry.context) : '',
  ].join('|');
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value) ?? String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(',')}}`;
}

async function handleCopyGroup(
  group: GroupedTraceEntry,
  setCopiedId: Dispatch<SetStateAction<string | null>>,
) {
  const payload = {
    fingerprint: group.fingerprint,
    count: group.count,
    firstTimestamp: group.firstTimestamp,
    latestTimestamp: group.latest.timestamp,
    latest: group.latest,
    entries: group.entries,
  };

  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  setCopiedId(group.fingerprint);
  window.setTimeout(() => setCopiedId((current) => (current === group.fingerprint ? null : current)), 1500);
}

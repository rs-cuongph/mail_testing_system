type TraceLevel = 'info' | 'warn' | 'error';
type TraceSource = 'app' | 'http' | 'socket' | 'window' | 'console';

export interface TraceEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  level: TraceLevel;
  source: TraceSource;
  message: string;
  eventName?: string;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  context?: unknown;
}

type TraceOptions = {
  context?: unknown;
  error?: unknown;
  eventName?: string;
};

type TraceMeta = {
  lastViewedAt?: string;
};

const TRACE_STORAGE_KEY = 'mail-testing-system:trace-log';
const TRACE_SESSION_KEY = 'mail-testing-system:trace-session';
const TRACE_META_STORAGE_KEY = 'mail-testing-system:trace-meta';
const TRACE_MAX_ENTRIES = 400;

let installed = false;
let consolePatched = false;
let entries: TraceEntry[] = loadStoredEntries();
let traceMeta: TraceMeta = loadTraceMeta();
const subscribers = new Set<(entries: TraceEntry[]) => void>();
const metaSubscribers = new Set<(meta: TraceMeta) => void>();

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(TRACE_SESSION_KEY);
    if (existing) {
      return existing;
    }

    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `trace-${Date.now()}`;
    window.sessionStorage.setItem(TRACE_SESSION_KEY, next);
    return next;
  } catch {
    return 'session-unavailable';
  }
}

const sessionId = getSessionId();

function loadStoredEntries() {
  try {
    const raw = window.localStorage.getItem(TRACE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TraceEntry[]).slice(-TRACE_MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function loadTraceMeta(): TraceMeta {
  try {
    const raw = window.localStorage.getItem(TRACE_META_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? (parsed as TraceMeta) : {};
  } catch {
    return {};
  }
}

function persistEntries() {
  try {
    window.localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage failures to avoid recursive logging loops.
  }
}

function persistTraceMeta() {
  try {
    window.localStorage.setItem(TRACE_META_STORAGE_KEY, JSON.stringify(traceMeta));
  } catch {
    // Ignore storage failures to avoid recursive logging loops.
  }
}

function notifySubscribers() {
  for (const subscriber of subscribers) {
    subscriber([...entries]);
  }
}

function notifyMetaSubscribers() {
  for (const subscriber of metaSubscribers) {
    subscriber({ ...traceMeta });
  }
}

function toSerializable(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Event) {
    return {
      type: value.type,
    };
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  if (depth >= 4) {
    return '[MaxDepth]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => toSerializable(item, depth + 1, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }

    seen.add(value as object);

    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      result[key] = toSerializable(nestedValue, depth + 1, seen);
    }

    return result;
  }

  return String(value);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {
    message: 'Unknown error',
    stack: undefined,
  };
}

function createEntry(level: TraceLevel, source: TraceSource, message: string, options?: TraceOptions): TraceEntry {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    sessionId,
    level,
    source,
    message,
    eventName: options?.eventName,
    error: options?.error ? normalizeError(options.error) : undefined,
    context: options?.context ? toSerializable(options.context) : undefined,
  };
}

export function addTrace(level: TraceLevel, source: TraceSource, message: string, options?: TraceOptions) {
  entries = [...entries, createEntry(level, source, message, options)].slice(-TRACE_MAX_ENTRIES);
  persistEntries();
  notifySubscribers();
}

export function traceInfo(source: TraceSource, message: string, options?: TraceOptions) {
  addTrace('info', source, message, options);
}

export function traceWarn(source: TraceSource, message: string, options?: TraceOptions) {
  addTrace('warn', source, message, options);
}

export function traceError(source: TraceSource, message: string, error?: unknown, context?: unknown) {
  addTrace('error', source, message, { error, context });
}

export function traceSocketInfo(message: string, eventName: string, context?: unknown) {
  addTrace('info', 'socket', message, { eventName, context });
}

export function traceSocketWarn(message: string, eventName: string, context?: unknown) {
  addTrace('warn', 'socket', message, { eventName, context });
}

export function traceSocketError(message: string, eventName: string, error?: unknown, context?: unknown) {
  addTrace('error', 'socket', message, { eventName, error, context });
}

export function getTraceEntries() {
  return [...entries];
}

export function clearTraceEntries() {
  entries = [];
  persistEntries();
  notifySubscribers();
}

export function getTraceMeta() {
  return { ...traceMeta };
}

export function markTraceViewed() {
  traceMeta = {
    ...traceMeta,
    lastViewedAt: new Date().toISOString(),
  };
  persistTraceMeta();
  notifyMetaSubscribers();
}

export function getUnviewedErrorCount() {
  const viewedAt = traceMeta.lastViewedAt ? new Date(traceMeta.lastViewedAt).getTime() : 0;

  return entries.filter(
    (entry) => entry.level === 'error' && new Date(entry.timestamp).getTime() > viewedAt,
  ).length;
}

export function subscribeTraceEntries(subscriber: (entries: TraceEntry[]) => void) {
  subscribers.add(subscriber);
  subscriber([...entries]);

  return () => {
    subscribers.delete(subscriber);
  };
}

export function subscribeTraceMeta(subscriber: (meta: TraceMeta) => void) {
  metaSubscribers.add(subscriber);
  subscriber({ ...traceMeta });

  return () => {
    metaSubscribers.delete(subscriber);
  };
}

export function installGlobalTraceHandlers() {
  if (installed) {
    return;
  }

  installed = true;

  window.addEventListener('error', (event) => {
    traceError('window', event.message || 'Unhandled window error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    traceError('window', 'Unhandled promise rejection', event.reason, {
      reason: event.reason,
    });
  });

  if (!consolePatched) {
    const originalConsoleError = window.console.error.bind(window.console);
    window.console.error = (...args: unknown[]) => {
      traceError('console', 'console.error called', args[0], {
        arguments: args.map((item) => toSerializable(item)),
      });
      originalConsoleError(...args);
    };
    consolePatched = true;
  }

  traceInfo('app', 'Trace logging initialized', {
    context: {
      href: window.location.href,
      userAgent: window.navigator.userAgent,
    },
  });
}

export function exportTraceLog() {
  const payload = {
    exportedAt: new Date().toISOString(),
    sessionId,
    href: window.location.href,
    userAgent: window.navigator.userAgent,
    entries: getTraceEntries(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mail-trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  traceInfo('app', 'Trace log exported', {
    context: {
      totalEntries: payload.entries.length,
    },
  });
}

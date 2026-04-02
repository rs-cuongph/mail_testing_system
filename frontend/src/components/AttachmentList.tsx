import type { AttachmentInfo } from '../types';
import { api } from '../services/api';

interface Props {
  attachments: AttachmentInfo[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ attachments }: Props) {
  if (attachments.length === 0) return null;
  return (
    <div className="attachment-list">
      <h4>📎 Attachments ({attachments.length})</h4>
      <ul>
        {attachments.map((a) => (
          <li key={a.id} className="attachment-item">
            <a
              href={api.getAttachmentDownloadUrl(a.id)}
              download={a.filename}
              className="attachment-link"
            >
              <span className="attachment-icon">📄</span>
              <span className="attachment-name">{a.filename}</span>
              <span className="attachment-size">{formatBytes(a.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

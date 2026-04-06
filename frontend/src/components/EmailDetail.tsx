import { useEffect, useState } from 'react';
import type { EmailDetail as EmailDetailType } from '../types';
import { api } from '../services/api';
import { EmailBodyViewer } from './EmailBodyViewer';
import { AttachmentList } from './AttachmentList';
import { ArrowLeft } from 'lucide-react';

interface Props {
  emailId: string;
  onClose: () => void;
}

export function EmailDetail({ emailId, onClose }: Props) {
  const [email, setEmail] = useState<EmailDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getEmailById(emailId)
      .then((e) => { 
        setEmail(e); 
        setError(null); 
        if (!e.isRead) {
          api.markAsRead(e.id).catch(console.error);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [emailId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'medium' });

  return (
    <div className="email-detail">
      <div className="email-detail-header">
        <button className="btn-back" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={16} /> Back
        </button>
        {email && <h3 className="email-detail-subject">{email.subject || '(no subject)'}</h3>}
      </div>

      {loading && <div className="state-msg">Loading email...</div>}
      {error && <div className="state-msg error">Error: {error}</div>}

      {email && (
        <>
          <dl className="email-metadata">
            <dt>From</dt><dd>{email.fromEmail}</dd>
            <dt>To</dt><dd>{email.toEmail}</dd>
            <dt>Date</dt><dd>{formatDate(email.receivedAt)}</dd>
            <dt>Message-ID</dt><dd className="monospace">{email.messageId}</dd>
          </dl>
          <AttachmentList attachments={email.attachments} />
          <EmailBodyViewer textBody={email.textBody} htmlBody={email.htmlBody} />
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { QrCode, Plus, X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import QrScannerModal from '../../components/QrScannerModal';

interface StagedRow {
  uid: string;
  num: number;
}

interface HistoryRow {
  record: string;
  uid: string;
}

export default function BatchLogPage() {
  const api = useApi();
  const { addToast } = useToast();

  const [fileNumber, setFileNumber] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('current-file-number');
      return saved ? JSON.parse(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [staging, setStaging] = useState<StagedRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Load recent history from API on mount
  useEffect(() => {
    api.get<any[]>('/batch-log/recent')
      .then((data) => {
        if (data && Array.isArray(data)) {
          const recs: HistoryRow[] = data.map((item) => ({
            record: item.file_number,
            uid: item.uid,
          }));
          setHistory(recs);
        }
      })
      .catch(() => {});
  }, [api]);

  // Persist file number locally
  useEffect(() => {
    try {
      localStorage.setItem('current-file-number', JSON.stringify(fileNumber));
    } catch {}
  }, [fileNumber]);

  const nextPaperNumber = (currentStaging: StagedRow[]) => {
    return currentStaging.length ? currentStaging[currentStaging.length - 1].num + 1 : 1;
  };

  const addStagedRow = (scannedUid: string) => {
    const cleanUid = scannedUid.trim();
    if (!cleanUid) return;

    setStaging((prev) => {
      if (prev.some((r) => r.uid === cleanUid)) {
        addToast('Already scanned in this file', 'error');
        return prev;
      }
      const nextNum = nextPaperNumber(prev);
      const updated = [...prev, { uid: cleanUid, num: nextNum }];
      addToast(`Added ${fileNumber}-${nextNum}`, 'success');
      return updated;
    });
  };

  const removeStagedRow = (idx: number) => {
    setStaging((prev) => {
      const nextArr = [...prev];
      nextArr.splice(idx, 1);
      return nextArr.map((r, i) => ({ ...r, num: i + 1 }));
    });
  };

  const changeFile = (delta: number) => {
    if (staging.length && !window.confirm(`You have unconfirmed scans for File ${fileNumber}. Switching files will discard them. Continue?`)) {
      return;
    }
    setFileNumber((prev) => Math.max(1, prev + delta));
    setStaging([]);
  };

  const handleManualAdd = () => {
    if (manualInput.trim()) {
      addStagedRow(manualInput.trim());
      setManualInput('');
    }
  };

  const handleConfirmSave = async () => {
    if (!staging.length || saving) return;
    setSaving(true);

    try {
      const payload = {
        records: staging.map((r) => ({
          uid: r.uid,
          file_number: `${fileNumber}-${r.num}`,
        })),
      };

      await api.post('/batch-log/confirm', payload);
      addToast(`Saved ${staging.length} paper(s) to File ${fileNumber}`, 'success');

      const newHistoryItems: HistoryRow[] = staging.map((r) => ({
        record: `${fileNumber}-${r.num}`,
        uid: r.uid,
      }));

      setHistory((prev) => [...newHistoryItems, ...prev]);
      setStaging([]);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to save batch log', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#101010',
        color: '#ececec',
        minHeight: '100vh',
        padding: '20px 16px 40px',
        maxWidth: 520,
        margin: '0 auto',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <h1
          style={{
            fontSize: 15,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#8a8a8a',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Batch Log
        </h1>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: '#f2f2f2',
            border: '1px solid #333333',
            borderRadius: 20,
            padding: '3px 10px',
          }}
        >
          Staging
        </span>
      </header>

      {/* File Number Card */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333333',
          borderRadius: 14,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8a8a8a',
            marginBottom: 6,
            display: 'block',
          }}
        >
          File Number
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 34,
              fontWeight: 600,
              color: '#f2f2f2',
              lineHeight: 1,
              flex: 1,
            }}
          >
            {fileNumber}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => changeFile(1)}
              style={{
                background: '#232323',
                border: '1px solid #333333',
                color: '#ececec',
                width: 40,
                height: 40,
                borderRadius: 10,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              aria-label="Increase file number"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Card */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333333',
          borderRadius: 14,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          style={{
            width: '100%',
            padding: 16,
            borderRadius: 12,
            border: 'none',
            background: '#f2f2f2',
            color: '#111',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <QrCode size={20} />
          <span>Scan Paper</span>
        </button>

        <div
          onClick={() => setShowManual((v) => !v)}
          style={{
            textAlign: 'center',
            marginTop: 10,
            fontSize: 12,
            color: '#8a8a8a',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          {showManual ? 'Hide manual entry' : 'Enter UID manually instead'}
        </div>

        {showManual && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
              placeholder="Paper UID"
              autoComplete="off"
              style={{
                flex: 1,
                background: '#232323',
                border: '1px solid #333333',
                borderRadius: 10,
                color: '#ececec',
                padding: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              onClick={handleManualAdd}
              style={{
                background: '#232323',
                border: '1px solid #333333',
                color: '#f2f2f2',
                borderRadius: 10,
                padding: '0 16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Section Title */}
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#8a8a8a',
          margin: '22px 0 8px 4px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          Staged this file <span style={{ color: '#f2f2f2' }}>{staging.length}</span>
        </span>
        <span>Next: {fileNumber}-{nextPaperNumber(staging)}</span>
      </div>

      {/* Staging Table Card */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333333',
          borderRadius: 14,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#8a8a8a',
                  fontWeight: 600,
                  padding: '8px 10px',
                  borderBottom: '1px solid #333333',
                }}
              >
                UID
              </th>
              <th
                style={{
                  textAlign: 'left',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#8a8a8a',
                  fontWeight: 600,
                  padding: '8px 10px',
                  borderBottom: '1px solid #333333',
                }}
              >
                Paper #
              </th>
              <th
                style={{
                  width: 36,
                  borderBottom: '1px solid #333333',
                }}
              />
            </tr>
          </thead>
          <tbody>
            {staging.map((r, i) => (
              <tr key={`${r.uid}-${i}`} style={{ borderBottom: i === staging.length - 1 ? 'none' : '1px solid #333333' }}>
                <td
                  style={{
                    padding: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: '#ececec',
                    wordBreak: 'break-all',
                  }}
                >
                  {r.uid}
                </td>
                <td
                  style={{
                    padding: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: '#f2f2f2',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fileNumber}-{r.num}
                </td>
                <td style={{ padding: 10, textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => removeStagedRow(i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999999',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staging.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8a8a8a', fontSize: 13, padding: '26px 10px' }}>
            No papers scanned yet for this file.
          </div>
        )}
      </div>

      {/* Confirm & Save Button */}
      <button
        type="button"
        onClick={handleConfirmSave}
        disabled={staging.length === 0 || saving}
        style={{
          width: '100%',
          padding: 15,
          borderRadius: 12,
          border: '1px solid #f2f2f2',
          background: 'transparent',
          color: '#f2f2f2',
          fontSize: 15,
          fontWeight: 700,
          cursor: staging.length === 0 || saving ? 'not-allowed' : 'pointer',
          marginTop: 12,
          opacity: staging.length === 0 || saving ? 0.35 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Confirm & Save to Database'}
      </button>

      {/* Confirmed History Dropdown */}
      <details
        open={historyOpen}
        onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}
        style={{ marginTop: 22 }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8a8a8a',
            margin: '0 0 8px 4px',
          }}
        >
          Confirmed history
        </summary>
        <div
          style={{
            background: '#1a1a1a',
            border: '1px solid #333333',
            borderRadius: 14,
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#8a8a8a',
                    fontWeight: 600,
                    padding: '8px 10px',
                    borderBottom: '1px solid #333333',
                  }}
                >
                  Record
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#8a8a8a',
                    fontWeight: 600,
                    padding: '8px 10px',
                    borderBottom: '1px solid #333333',
                  }}
                >
                  UID
                </th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 50).map((h, idx) => (
                <tr key={`${h.record}-${h.uid}-${idx}`} style={{ borderBottom: idx === history.length - 1 ? 'none' : '1px solid #333333' }}>
                  <td
                    style={{
                      padding: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      color: '#f2f2f2',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.record}
                  </td>
                  <td
                    style={{
                      padding: 10,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      color: '#ececec',
                      wordBreak: 'break-all',
                    }}
                  >
                    {h.uid}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8a8a8a', fontSize: 13, padding: '26px 10px' }}>
              Nothing confirmed yet.
            </div>
          )}
        </div>
      </details>

      <QrScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title="Scan Paper QR Code"
        onScanSuccess={(scannedText) => {
          addStagedRow(scannedText);
          setQrOpen(false);
        }}
      />
    </div>
  );
}

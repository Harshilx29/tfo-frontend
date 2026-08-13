import { useState, useEffect, useCallback } from 'react';
import { QrCode, X, Check } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import QrScannerModal from '../../components/QrScannerModal';

interface PendingItem {
  id: number | string;
  uid: string;
  created_at: string;
}

interface StagedRow {
  id?: number | string;
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
      return saved ? Math.max(1, JSON.parse(saved)) : 1;
    } catch {
      return 1;
    }
  });

  const [pendingPool, setPendingPool] = useState<PendingItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [baseNextPaperNum, setBaseNextPaperNum] = useState(1);

  const [staging, setStaging] = useState<StagedRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  // 1. Fetch pending pool (up to ~80 rows where file_number IS NULL)
  const fetchPendingPool = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await api.get<PendingItem[]>('/batch-log/pending');
      setPendingPool(data ?? []);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to load pending pool', 'error');
    } finally {
      setLoadingPending(false);
    }
  }, [api, addToast]);

  // 2. Fetch true next paper number for current fileNumber from DB
  const fetchNextPaperNumber = useCallback(async (fNum: number) => {
    try {
      const res = await api.get<{ fileId: number; nextPaperNumber: number }>(
        `/batch-log/next-paper-number?fileId=${fNum}`
      );
      setBaseNextPaperNum(res.nextPaperNumber || 1);
    } catch {
      setBaseNextPaperNum(1);
    }
  }, [api]);

  // Load pending pool & recent history on mount
  useEffect(() => {
    void fetchPendingPool();
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
  }, [fetchPendingPool, api]);

  // When fileNumber changes, re-fetch true next paper number from DB
  useEffect(() => {
    void fetchNextPaperNumber(fileNumber);
    try {
      localStorage.setItem('current-file-number', JSON.stringify(fileNumber));
    } catch {}
  }, [fileNumber, fetchNextPaperNumber]);

  // Derive next paper number for staging (baseNextPaperNum + current staging count)
  const currentNextPaperNum = baseNextPaperNum + staging.length;

  // Add scanned paper UID to staging after validating against pending pool
  const addStagedRow = (scannedUid: string) => {
    const cleanUid = scannedUid.trim();
    if (!cleanUid) return;

    // Check if in staging already
    if (staging.some((r) => r.uid.toLowerCase() === cleanUid.toLowerCase())) {
      addToast(`UID "${cleanUid}" is already in staging`, 'error');
      return;
    }

    // Match scanned UID against pending pool (instant local check)
    const match = pendingPool.find((p) => p.uid.toLowerCase() === cleanUid.toLowerCase());
    if (!match) {
      addToast(`Error: Paper "${cleanUid}" is not in the pending pool (unknown or already assigned)`, 'error');
      return;
    }

    const assignedNum = currentNextPaperNum;
    setStaging((prev) => [
      ...prev,
      { id: match.id, uid: match.uid, num: baseNextPaperNum + prev.length },
    ]);
    addToast(`Staged ${match.uid} as ${fileNumber}-${assignedNum}`, 'success');
  };

  const removeStagedRow = (originalIdx: number) => {
    setStaging((prev) => {
      const nextArr = [...prev];
      nextArr.splice(originalIdx, 1);
      // Re-sequence numbers so papers remain contiguous
      return nextArr.map((r, i) => ({ ...r, num: baseNextPaperNum + i }));
    });
  };

  // Increment-only file number control (no decrement button)
  const incrementFileNumber = () => {
    if (staging.length && !window.confirm(`You have unconfirmed scans for File ${fileNumber}. Switching files will discard staged scans. Continue?`)) {
      return;
    }
    setFileNumber((prev) => prev + 1);
    setStaging([]);
  };

  const handleManualAdd = () => {
    if (manualInput.trim()) {
      addStagedRow(manualInput.trim());
      setManualInput('');
    }
  };

  // Confirm & Save with conditional update check
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

      const res = await api.post<any>('/batch-log/confirm', payload);

      if (res && res.results) {
        const failed = res.results.filter((r: any) => !r.ok);
        const succeeded = res.results.filter((r: any) => r.ok);

        if (failed.length > 0) {
          // Surface specific conflicts
          const conflictUids = failed.map((f: any) => `${f.uid} (${f.error})`).join(', ');
          addToast(`Conflict detected: ${conflictUids}`, 'error');

          // Keep failed rows in staging so user can redo or remove
          const failedUidSet = new Set(failed.map((f: any) => f.uid.toLowerCase()));
          setStaging((prev) => prev.filter((r) => failedUidSet.has(r.uid.toLowerCase())));
        } else {
          addToast(`Successfully confirmed ${succeeded.length} paper(s) to File ${fileNumber}`, 'success');
          setStaging([]);
        }

        if (succeeded.length > 0) {
          const newHistory: HistoryRow[] = succeeded.map((s: any) => ({
            record: s.file_number,
            uid: s.uid,
          }));
          setHistory((prev) => [...newHistory, ...prev]);
        }
      } else {
        addToast(`Saved ${staging.length} paper(s) to File ${fileNumber}`, 'success');
        setStaging([]);
      }

      // Always refresh pending pool & next paper number after confirm attempt
      void fetchPendingPool();
      void fetchNextPaperNumber(fileNumber);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to save batch log', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reversed staging list (newest scanned at the top)
  const reversedStaging = staging.slice().reverse();

  return (
    <div
      style={{
        background: '#101010',
        color: '#ececec',
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '20px 16px 120px',
        maxWidth: 520,
        margin: '0 auto',
        fontFamily: "'IBM Plex Sans', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* Sentence-case plain header title matching Track page */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#ececec',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Batch Log
        </h1>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            color: '#ececec',
            background: '#1a1a1a',
            border: '1px solid #333333',
            borderRadius: 20,
            padding: '3px 10px',
          }}
        >
          Pool: {loadingPending ? '…' : pendingPool.length}
        </span>
      </header>

      {/* File Number Card (Increment-only) */}
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
            fontWeight: 500,
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
              color: '#ececec',
              lineHeight: 1,
              flex: 1,
            }}
          >
            {fileNumber}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={incrementFileNumber}
              style={{
                background: '#232323',
                border: '1px solid #333333',
                color: '#ececec',
                width: 42,
                height: 42,
                borderRadius: 10,
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              aria-label="Increase file number"
              title="Increment File Number"
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
            background: '#ececec',
            color: '#111111',
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
                color: '#ececec',
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

      {/* Section Subhead */}
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#8a8a8a',
          margin: '22px 0 10px 4px',
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 600,
        }}
      >
        <span>
          Staged this file <span style={{ color: '#ececec' }}>({staging.length})</span>
        </span>
        <span>Next: {fileNumber}-{currentNextPaperNum}</span>
      </div>

      {/* Staged Cards List (Newest First) */}
      <div style={{ marginBottom: 14 }}>
        {reversedStaging.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#8a8a8a',
              fontSize: 13,
              padding: '28px 16px',
              background: '#1a1a1a',
              border: '1px solid #333333',
              borderRadius: 14,
            }}
          >
            No papers scanned yet for this file.
          </div>
        ) : (
          reversedStaging.map((r, reverseIdx) => {
            const originalIndex = staging.length - 1 - reverseIdx;
            return (
              <div
                key={`${r.uid}-${r.num}`}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                {/* Header row with Record Badge (top-left) & Remove button (top-right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#ececec',
                      background: '#232323',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #444444',
                    }}
                  >
                    {fileNumber}-{r.num}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStagedRow(originalIndex)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8a8a8a',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label="Remove"
                    title="Remove paper"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Details row matching Track label style */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a8a8a', fontWeight: 600 }}>
                    UID
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#ececec', wordBreak: 'break-all', fontWeight: 500 }}>
                    {r.uid}
                  </span>
                </div>
              </div>
            );
          })
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
          border: '1px solid #ececec',
          background: 'transparent',
          color: '#ececec',
          fontSize: 15,
          fontWeight: 700,
          cursor: staging.length === 0 || saving ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          opacity: staging.length === 0 || saving ? 0.35 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Confirm & Save to Database'}
      </button>

      {/* Confirmed History Section */}
      <details
        open={historyOpen}
        onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}
        style={{ marginTop: 10 }}
      >
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8a8a8a',
            margin: '0 0 10px 4px',
            fontWeight: 600,
          }}
        >
          Confirmed history ({history.length})
        </summary>

        {history.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#8a8a8a',
              fontSize: 13,
              padding: '24px 16px',
              background: '#1a1a1a',
              border: '1px solid #333333',
              borderRadius: 14,
            }}
          >
            Nothing confirmed yet.
          </div>
        ) : (
          history.slice(0, 50).map((h, idx) => (
            <div
              key={`${h.record}-${h.uid}-${idx}`}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333333',
                borderRadius: 14,
                padding: 16,
                marginBottom: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Header row with Record Badge (top-left) & Confirmed Status (top-right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#ececec',
                    background: '#232323',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #444444',
                  }}
                >
                  {h.record}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: '#8a8a8a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Check size={13} /> Confirmed
                </span>
              </div>

              {/* Details row matching Track label style */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a8a8a', fontWeight: 600 }}>
                  UID
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#ececec', wordBreak: 'break-all', fontWeight: 500 }}>
                  {h.uid}
                </span>
              </div>
            </div>
          ))
        )}
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

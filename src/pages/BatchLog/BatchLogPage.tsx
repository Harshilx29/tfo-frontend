import { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardList, Plus, Search, QrCode, X } from 'lucide-react';
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

export default function BatchLogPage() {
  const api = useApi();
  const { addToast } = useToast();
  const pageBodyRef = useRef<HTMLDivElement>(null);

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
  const [paperInput, setPaperInput] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Fetch pending pool (all rows where file_number IS NULL)
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

  // Load pending pool on mount
  useEffect(() => {
    void fetchPendingPool();
  }, [fetchPendingPool]);

  // When fileNumber changes, re-fetch true next paper number from DB
  useEffect(() => {
    void fetchNextPaperNumber(fileNumber);
    try {
      localStorage.setItem('current-file-number', JSON.stringify(fileNumber));
    } catch {}
  }, [fileNumber, fetchNextPaperNumber]);

  // Derive next paper number for staging
  const currentNextPaperNum = baseNextPaperNum + staging.length;

  // Add paper UID to staging after validating against pending pool
  // Returns true if successfully staged without error, false on failure
  const addStagedRow = (scannedUid: string): boolean => {
    let cleanUid = scannedUid.trim();
    if (!cleanUid) return false;

    // Strip leading "TFO=" prefix if present (e.g. TFO=26-1 -> 26-1, TFO=26-35 -> 26-35)
    const tfoMatch = cleanUid.match(/^TFO=(.+)$/i);
    if (tfoMatch) {
      cleanUid = tfoMatch[1].trim();
    }

    // Check if in staging already
    if (staging.some((r) => r.uid.toLowerCase() === cleanUid.toLowerCase())) {
      addToast(`UID "${cleanUid}" is already in staging`, 'error');
      return false;
    }

    // Match scanned UID against pending pool (instant local check)
    const match = pendingPool.find((p) => p.uid.toLowerCase() === cleanUid.toLowerCase());
    if (!match) {
      addToast(`Error: Batch details for "${cleanUid}" are incomplete or unconfirmed — complete the batch before logging to file.`, 'error');
      return false;
    }

    const assignedNum = currentNextPaperNum;
    setStaging((prev) => [
      ...prev,
      { id: match.id, uid: match.uid, num: baseNextPaperNum + prev.length },
    ]);
    addToast(`Staged ${match.uid} as ${fileNumber}-${assignedNum}`, 'success');
    return true;
  };

  const removeStagedRow = (originalIdx: number) => {
    setStaging((prev) => {
      const nextArr = [...prev];
      nextArr.splice(originalIdx, 1);
      // Re-sequence numbers so papers remain contiguous
      return nextArr.map((r, i) => ({ ...r, num: baseNextPaperNum + i }));
    });
  };

  // Switch to a specific File Number (e.g. back to File #1)
  const changeFileNumber = () => {
    const input = window.prompt(`Enter File Number to switch to:`, String(fileNumber));
    if (input === null) return;

    const parsed = parseInt(input.trim(), 10);
    if (isNaN(parsed) || parsed < 1) {
      addToast('Invalid File Number — please enter a positive integer', 'error');
      return;
    }

    if (parsed === fileNumber) return;

    if (staging.length > 0) {
      if (!window.confirm(`Switching to File #${parsed} will clear ${staging.length} staged scan(s) for File #${fileNumber}. Continue?`)) {
        return;
      }
    }

    setFileNumber(parsed);
    setStaging([]);
    addToast(`Switched to File #${parsed}`, 'info');
  };

  // Increment-only file number control (+ New File pill button with confirmation warning)
  const incrementFileNumber = () => {
    const nextNum = fileNumber + 1;
    const warningMsg = staging.length > 0
      ? `Start File #${nextNum}? Warning: Staging has ${staging.length} unconfirmed scan(s) for File #${fileNumber} which will be discarded.`
      : `Are you sure you want to start a new file? Current File #${fileNumber} will change to File #${nextNum}.`;

    if (!window.confirm(warningMsg)) return;

    setFileNumber(nextNum);
    setStaging([]);
    addToast(`Started File #${nextNum}`, 'info');
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
          const conflictUids = failed.map((f: any) => `${f.uid} (${f.error})`).join(', ');
          addToast(`Conflict detected: ${conflictUids}`, 'error');

          const failedUidSet = new Set(failed.map((f: any) => f.uid.toLowerCase()));
          setStaging((prev) => prev.filter((r) => failedUidSet.has(r.uid.toLowerCase())));
        } else {
          addToast(`Successfully confirmed ${succeeded.length} paper(s) to File #${fileNumber}`, 'success');
          setStaging([]);
        }
      } else {
        addToast(`Saved ${staging.length} paper(s) to File ${fileNumber}`, 'success');
        setStaging([]);
      }

      void fetchPendingPool();
      void fetchNextPaperNumber(fileNumber);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to save batch log', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reversed staging list (newest scanned at top)
  const reversedStaging = staging.slice().reverse();

  return (
    <div className="company-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header — matching Companies page header */}
      <header
        className="page-header"
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
          <ClipboardList size={20} />
          Batch Log
          <button
            type="button"
            onClick={changeFileNumber}
            title="Click to switch File Number"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '12px',
              fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
              padding: '2px 8px',
              borderRadius: '12px',
              cursor: 'pointer',
              marginLeft: '4px',
              fontWeight: 500,
            }}
          >
            File #{fileNumber} ✎
          </button>
        </h1>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={incrementFileNumber}
          title="Start a new File Number"
        >
          <Plus size={16} /> New File
        </button>
      </header>

      {/* Page Body with full vertical scrolling */}
      <div className="page-body" ref={pageBodyRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '100px' }}>
        {/* Search-bar-style input row matching Companies search bar + QR icon button */}
        <div className="search-bar-container" style={{ margin: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Enter or scan paper UID..."
              value={paperInput}
              onChange={(e) => setPaperInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && paperInput.trim()) {
                  addStagedRow(paperInput.trim());
                  setPaperInput('');
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
              }}
            />
            {paperInput.trim() && (
              <button
                type="button"
                onClick={() => setPaperInput('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            title="Scan Paper QR Code"
            onClick={() => setQrOpen(true)}
            style={{
              height: 36,
              width: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <QrCode size={18} />
          </button>
        </div>

        {/* Section Subhead */}
        <div
          style={{
            padding: '0 16px 8px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 600,
          }}
        >
          <span>Staged Papers ({staging.length})</span>
          <span>Next: {fileNumber}-{currentNextPaperNum}</span>
        </div>

        {/* Plain divided list matching Companies list items */}
        {reversedStaging.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No papers scanned yet for File #{fileNumber}.
          </div>
        ) : (
          <ul className="company-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {reversedStaging.map((r, reverseIdx) => {
              const originalIndex = staging.length - 1 - reverseIdx;
              return (
                <li
                  key={`${r.uid}-${r.num}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {fileNumber}-{r.num}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)", fontSize: '12px', color: 'var(--text-muted)' }}>
                      {r.uid}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStagedRow(originalIndex)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove paper"
                  >
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Confirm & Save Button */}
        {staging.length > 0 && (
          <div style={{ padding: '16px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmSave}
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : `Confirm & Save (${staging.length}) to File #${fileNumber}`}
            </button>
          </div>
        )}
      </div>

      <QrScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title="Scan Paper QR Code"
        validationRegex={/^(TFO=)?\d{2}-\d+$/i}
        validationErrorMessage="Invalid QR format. Expected TFO=YY-Number (e.g. TFO=26-1 or TFO=26-35)"
        hintText="Scan a paper QR code starting with 'TFO=' (e.g. TFO=26-1 or TFO=26-35)"
        onScanSuccess={(scannedText) => {
          const success = addStagedRow(scannedText);
          setQrOpen(false);
          if (success) {
            // Re-open QR scanner directly for rapid continuous scanning
            setTimeout(() => {
              setQrOpen(true);
            }, 250);
          }
        }}
      />
    </div>
  );
}

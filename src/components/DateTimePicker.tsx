import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_HDRS = ["SU","MO","TU","WE","TH","FR","SA"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function toH12(h24: number): number { return h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24; }
function toH24(h12: number, ap: "AM" | "PM"): number {
  if (ap === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}
function pad(n: number): string { return String(n).padStart(2, "0"); }

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  startDateVal?: string; // The loading datetime string (From)
}
interface DayObj { day: number; date: Date; isCur: boolean; }

// ── Component ────────────────────────────────────────────────────────────────
export default function DateTimePicker({ value, onChange, label = "From", startDateVal }: Props) {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const parse = (v: string): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const existing = parse(value);
  const startD = startDateVal ? parse(startDateVal) : null;

  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(existing?.getMonth() ?? todayMidnight.getMonth());
  const [viewYear, setViewYear] = useState(existing?.getFullYear() ?? todayMidnight.getFullYear());
  const [selDate, setSelDate] = useState<Date | null>(
    existing ? new Date(existing.getFullYear(), existing.getMonth(), existing.getDate()) : null
  );
  const [hrs, setHrs] = useState(existing ? toH12(existing.getHours()) : 10);
  const [mins, setMins] = useState(existing?.getMinutes() ?? 0);
  const [ampm, setAmpm] = useState<"AM" | "PM">(existing ? (existing.getHours() >= 12 ? "PM" : "AM") : "AM");
  const [openDrop, setOpenDrop] = useState<"month" | "year" | "hours" | "mins" | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover or dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setOpenDrop(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const d = parse(value);
    if (d) {
      setSelDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      setViewMonth(d.getMonth());
      setViewYear(d.getFullYear());
      setHrs(toH12(d.getHours()));
      setMins(d.getMinutes());
      setAmpm(d.getHours() >= 12 ? "PM" : "AM");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = useCallback((date: Date | null, h: number, m: number, ap: "AM" | "PM") => {
    if (!date) return;
    const h24 = toH24(h, ap);
    // Include the browser's local UTC offset so Postgres stores the correct
    // local instant (e.g. "2026-08-03T22:20+05:30") instead of treating the
    // naive string as UTC and shifting it on read-back.
    const offsetMins = -new Date().getTimezoneOffset(); // e.g. +330 for IST
    const sign = offsetMins >= 0 ? '+' : '-';
    const absOff = Math.abs(offsetMins);
    const offH = pad(Math.floor(absOff / 60));
    const offM = pad(absOff % 60);
    const tzSuffix = `${sign}${offH}:${offM}`;
    onChange(`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(h24)}:${pad(m)}:00${tzSuffix}`);
  }, [onChange]);

  const genDays = (): DayObj[] => {
    const dInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const dInPrev = new Date(viewYear, viewMonth, 0).getDate();
    const days: DayObj[] = [];
    for (let i = firstDay; i > 0; i--) {
      const d = dInPrev - i + 1;
      days.push({ day: d, date: new Date(viewYear, viewMonth-1, d), isCur: false });
    }
    for (let i = 1; i <= dInMonth; i++) {
      days.push({ day: i, date: new Date(viewYear, viewMonth, i), isCur: true });
    }
    const trail = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
    for (let i = 1; i <= trail; i++) {
      days.push({ day: i, date: new Date(viewYear, viewMonth+1, i), isCur: false });
    }
    return days;
  };

  const allDays = genDays();
  const years = Array.from({ length: 21 }, (_, i) => todayMidnight.getFullYear() - 10 + i);

  // Range Helpers
  const isSel = (d: Date) => selDate ? d.toDateString() === selDate.toDateString() : false;
  const isToday = (d: Date) => d.toDateString() === todayMidnight.toDateString();
  const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()} - ${DAYS_FULL[d.getDay()]}`;

  const isStart = (d: Date) => {
    return startD ? d.toDateString() === startD.toDateString() : false;
  };

  const isInRange = (d: Date) => {
    if (!startD || !selDate) return false;
    const startZero = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
    return d > startZero && d < selDate;
  };

  const isDisabled = (d: Date) => {
    if (!startD) return false;
    const startZero = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
    return d < startZero;
  };

  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };
  
  const selectDate = (d: Date) => {
    if (isDisabled(d)) return;
    setSelDate(d);
    emit(d, hrs, mins, ampm);
  };

  const changeH = (h: number) => { setHrs(h); setOpenDrop(null); emit(selDate, h, mins, ampm); };
  const changeM = (m: number) => { setMins(m); setOpenDrop(null); emit(selDate, hrs, m, ampm); };
  const toggleAP = () => { const na: "AM" | "PM" = ampm==="AM"?"PM":"AM"; setAmpm(na); emit(selDate, hrs, mins, na); };
  const toggle = (d: typeof openDrop) => setOpenDrop(prev => prev===d ? null : d);

  const getDisplayValue = () => {
    if (!value) return "Select date & time...";
    const d = parse(value);
    if (!d) return "Select date & time...";
    const formattedDate = d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
    const formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${formattedDate} ${formattedTime}`;
  };

  return (
    <div className="dtp-container" ref={containerRef}>
      <button
        type="button"
        className="dtp-input-field"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "dtp-input-text" : "dtp-input-text placeholder"}>
          {getDisplayValue()}
        </span>
        <svg className="dtp-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {isOpen && (
        <div className="dtp-popover">
          <div className="dtp-card">
            <div className="dtp-cal">
              <div className="dtp-cal-header">
                <button className="dtp-nav-btn" type="button" onClick={prevMonth}>&#8249;</button>
                <div className="dtp-dropdowns">
                  <div className="dtp-drop-wrap">
                    <button className="dtp-drop-btn" type="button" onClick={() => toggle("month")}>
                      {MONTHS[viewMonth]}<span className="dtp-caret">&#9660;</span>
                    </button>
                    {openDrop === "month" && (
                      <div className="dtp-drop-list">
                        {MONTHS.map((m, i) => (
                          <button key={i} type="button" className={`dtp-drop-item${viewMonth===i?" active":""}`}
                            onClick={() => { setViewMonth(i); setOpenDrop(null); }}>{m}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="dtp-drop-wrap">
                    <button className="dtp-drop-btn" type="button" onClick={() => toggle("year")}>
                      {viewYear}<span className="dtp-caret">&#9660;</span>
                    </button>
                    {openDrop === "year" && (
                      <div className="dtp-drop-list dtp-drop-list--right">
                        {years.map(y => (
                          <button key={y} type="button" className={`dtp-drop-item${viewYear===y?" active":""}`}
                            onClick={() => { setViewYear(y); setOpenDrop(null); }}>{y}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button className="dtp-nav-btn" type="button" onClick={nextMonth}>&#8250;</button>
              </div>
              <div className="dtp-day-headers">
                {DAY_HDRS.map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="dtp-grid">
                {allDays.map((dayObj, i) => {
                  const d = dayObj.date;
                  const selected = isSel(d);
                  const start = isStart(d);
                  const range = isInRange(d);
                  const disabled = isDisabled(d);
                  const today = isToday(d);
                  
                  return (
                    <div key={i} className="dtp-day-cell">
                      {range && <div className="dtp-range-line" />}
                      {start && selDate && <div className="dtp-range-line-right" />}
                      {selected && startD && <div className="dtp-range-line-left" />}
                      
                      <button type="button"
                        disabled={disabled}
                        className={[
                          "dtp-day",
                          selected || start ? "selected" : "",
                          today && !selected && !start ? "today" : "",
                          !dayObj.isCur ? "other-month" : "",
                          disabled ? "disabled" : ""
                        ].filter(Boolean).join(" ")}
                        onClick={() => selectDate(d)}
                      >
                        <span className="dtp-day-text">{dayObj.day}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Read-only Starting Date details for Unloading page */}
            {label === "To" && startD && (
              <>
                <div className="dtp-readonly-row">
                  <div className="dtp-date-info">
                    <span className="dtp-from-label">From (Loading)</span>
                    <div className="dtp-date-display">
                      <span className="dtp-day-number">{pad(startD.getDate())}</span>
                      <span className="dtp-date-meta">{fmtDate(startD)}</span>
                    </div>
                  </div>
                  <div className="dtp-time dtp-time--readonly">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13" style={{opacity:.45,flexShrink:0}}>
                      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                    <span className="dtp-readonly-time-text">
                      {pad(toH12(startD.getHours()))}:{pad(startD.getMinutes())} {startD.getHours() >= 12 ? "PM" : "AM"}
                    </span>
                  </div>
                </div>
                <div className="dtp-bottom-divider" />
              </>
            )}

            <div className="dtp-bottom">
              <div className="dtp-date-info">
                <span className="dtp-from-label">{label}</span>
                <div className="dtp-date-display">
                  <span className="dtp-day-number">{selDate ? pad(selDate.getDate()) : "--"}</span>
                  <span className="dtp-date-meta">{selDate ? fmtDate(selDate) : "Select date"}</span>
                </div>
              </div>
              <div className="dtp-time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13" style={{opacity:.45,flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                <div className="dtp-time-drop-wrap">
                  <button className="dtp-time-btn" type="button" onClick={() => toggle("hours")}>{pad(hrs)}</button>
                  {openDrop === "hours" && (
                    <div className="dtp-time-list">
                      {Array.from({length:12},(_,i)=>i+1).map(h => (
                        <button key={h} type="button" className={`dtp-time-item${hrs===h?" active":""}`} onClick={() => changeH(h)}>{pad(h)}</button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="dtp-colon">:</span>
                <div className="dtp-time-drop-wrap">
                  <button className="dtp-time-btn" type="button" onClick={() => toggle("mins")}>{pad(mins)}</button>
                  {openDrop === "mins" && (
                    <div className="dtp-time-list">
                      {Array.from({length:60},(_,i)=>i).map(m => (
                        <button key={m} type="button" className={`dtp-time-item${mins===m?" active":""}`} onClick={() => changeM(m)}>{pad(m)}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="dtp-ampm-btn" type="button" onClick={toggleAP}>{ampm}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

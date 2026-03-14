import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
type View = "month" | "year" | "day";
type Mode = "card" | "name";

interface AppState {
  mode: Mode;
  forcedItem: string;
  nameList: string[];
  events: Record<string, string[]>;
  firstPickedDate: string | null;
  lockedForcedDate: string | null;
}

interface CalPos {
  month: number;
  year: number;
}

// ── Constants ─────────────────────────────────────────────────────────────
const SUITS = [
  "Spades \u2660",
  "Hearts \u2665",
  "Diamonds \u2666",
  "Clubs \u2663",
];
const VALS = [
  "Ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Jack",
  "Queen",
  "King",
];
const ALL_CARDS: string[] = VALS.flatMap((v) =>
  SUITS.map((s) => `${v} of ${s}`),
);
const DEFAULT_NAMES = [
  "Rahul",
  "Sarah",
  "Daniel",
  "Priya",
  "Arjun",
  "David",
  "Meera",
];
const EVENT_COLORS = [
  "#34C759",
  "#007AFF",
  "#FF9500",
  "#FF3B30",
  "#5AC8FA",
  "#AF52DE",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const STORAGE_KEY = "apple-cal-v2";

// ── Helpers ───────────────────────────────────────────────────────────────
function dk(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getTodayStr(): string {
  const t = new Date();
  return dk(t.getFullYear(), t.getMonth(), t.getDate());
}

function colorForEvent(ev: string): string {
  let h = 0;
  for (const c of ev) h = (h << 5) - h + c.charCodeAt(0);
  return EVENT_COLORS[Math.abs(h) % EVENT_COLORS.length];
}

function peekFormat(dateStr: string): string {
  const p = dateStr.split("-");
  return `${p[2]} ${SHORT_MONTHS[Number.parseInt(p[1]) - 1]}`;
}

function generateEvents(mode: Mode, names: string[]): Record<string, string[]> {
  const ev: Record<string, string[]> = {};
  const yr = new Date().getFullYear();
  const safeNames = names.length > 0 ? names : DEFAULT_NAMES;
  for (let y = yr - 1; y <= yr + 1; y++) {
    for (let m = 0; m < 12; m++) {
      const days = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        if (Math.random() > 0.4) {
          const k = dk(y, m, d);
          if (mode === "card") {
            const n = Math.floor(Math.random() * 3) + 1;
            ev[k] = [...ALL_CARDS].sort(() => Math.random() - 0.5).slice(0, n);
          } else {
            const n = Math.floor(Math.random() * 2) + 1;
            ev[k] = Array.from(
              { length: n },
              () => safeNames[Math.floor(Math.random() * safeNames.length)],
            );
          }
        }
      }
    }
  }
  return ev;
}

function loadState(): AppState | null {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r) as AppState;
  } catch {}
  return null;
}

// ── Shared styles ─────────────────────────────────────────────────────────
const pillBtn: CSSProperties = {
  background: "rgba(44,44,46,0.9)",
  border: "none",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: 20,
  fontSize: 15,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 4,
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
};

const roundBtn: CSSProperties = {
  background: "rgba(44,44,46,0.9)",
  border: "none",
  color: "#fff",
  width: 34,
  height: 34,
  borderRadius: 17,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  fontWeight: 300,
  cursor: "pointer",
  fontFamily: "inherit",
  flexShrink: 0,
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
};

// ── SVG Icons ──────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg
      aria-label="Search"
      role="img"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconCalGrid() {
  return (
    <svg
      aria-label="Calendar grid"
      role="img"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg
      aria-label="Inbox"
      role="img"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const today = new Date();
  const todayStr = getTodayStr();

  const [view, setView] = useState<View>("month");
  const [calPos, setCalPos] = useState<CalPos>({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tapFeedback, setTapFeedback] = useState<string | null>(null);

  const [appState, setAppState] = useState<AppState>(() => {
    const saved = loadState();
    if (saved) return saved;
    return {
      mode: "card",
      forcedItem: ALL_CARDS[0],
      nameList: [...DEFAULT_NAMES],
      events: generateEvents("card", DEFAULT_NAMES),
      firstPickedDate: null,
      lockedForcedDate: null,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Triple-tap on month title
  const titleTapRef = useRef({
    count: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
  });
  const handleMonthTitleTap = useCallback(() => {
    titleTapRef.current.count++;
    if (titleTapRef.current.timer) clearTimeout(titleTapRef.current.timer);
    if (titleTapRef.current.count >= 3) {
      titleTapRef.current.count = 0;
      setShowSettings(true);
    } else {
      titleTapRef.current.timer = setTimeout(() => {
        titleTapRef.current.count = 0;
      }, 600);
    }
  }, []);

  // Long press on + button
  const plusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPressTimer = useCallback(() => {
    plusTimerRef.current = setTimeout(() => setShowSettings(true), 500);
  }, []);
  const cancelPressTimer = useCallback(() => {
    if (plusTimerRef.current) {
      clearTimeout(plusTimerRef.current);
      plusTimerRef.current = null;
    }
  }, []);

  // Swipe & 3-finger gesture on month view
  const touchRef = useRef<{ x: number; y: number; n: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      n: e.touches.length,
    };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const n = touchRef.current.n;
    touchRef.current = null;

    // 3-finger swipe down → reset everything
    if (n >= 3 && dy > 80) {
      setAppState((prev) => ({
        ...prev,
        events: generateEvents(prev.mode, prev.nameList),
        firstPickedDate: null,
        lockedForcedDate: null,
      }));
      return;
    }

    // Horizontal swipe → change month
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        setCalPos((p) =>
          p.month === 11
            ? { month: 0, year: p.year + 1 }
            : { ...p, month: p.month + 1 },
        );
      } else {
        setCalPos((p) =>
          p.month === 0
            ? { month: 11, year: p.year - 1 }
            : { ...p, month: p.month - 1 },
        );
      }
    }
  }, []);

  // Date tap — first tap injects forced item
  const handleDateTap = useCallback((dateStr: string) => {
    setTapFeedback(dateStr);
    setTimeout(() => setTapFeedback(null), 150);

    setAppState((prev) => {
      if (prev.lockedForcedDate) return prev;
      const newEvents = { ...prev.events };
      const existing = newEvents[dateStr] || [];
      newEvents[dateStr] = [
        prev.forcedItem,
        ...existing.filter((e) => e !== prev.forcedItem),
      ];
      return {
        ...prev,
        events: newEvents,
        firstPickedDate: dateStr,
        lockedForcedDate: dateStr,
      };
    });

    setSelectedDate(dateStr);
    setView("day");
  }, []);

  const goToday = useCallback(() => {
    setCalPos({ month: today.getMonth(), year: today.getFullYear() });
  }, [today]);

  return (
    <div
      style={{
        height: "100dvh",
        background: "#000",
        color: "#fff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      onTouchStart={view === "month" ? handleTouchStart : undefined}
      onTouchEnd={view === "month" ? handleTouchEnd : undefined}
    >
      {view === "month" && (
        <MonthView
          year={calPos.year}
          month={calPos.month}
          todayStr={todayStr}
          events={appState.events}
          tapFeedback={tapFeedback}
          onDateTap={handleDateTap}
          onMonthTitleTap={handleMonthTitleTap}
          onPlusStart={startPressTimer}
          onPlusEnd={cancelPressTimer}
          onYearTap={() => setView("year")}
          onTodayTap={goToday}
        />
      )}

      {view === "year" && (
        <YearView
          year={calPos.year}
          todayStr={todayStr}
          events={appState.events}
          onMonthTap={(m) => {
            setCalPos((p) => ({ ...p, month: m }));
            setView("month");
          }}
          onBack={() => setView("month")}
          onPlusStart={startPressTimer}
          onPlusEnd={cancelPressTimer}
        />
      )}

      {view === "day" && selectedDate && (
        <DayView
          dateStr={selectedDate}
          events={appState.events[selectedDate] || []}
          onBack={() => setView("month")}
          onTodayTap={() => {
            goToday();
            setSelectedDate(null);
            setView("month");
          }}
        />
      )}

      {showSettings && (
        <SettingsPanel
          appState={appState}
          onClose={() => setShowSettings(false)}
          onUpdateMode={(mode) => {
            setAppState((prev) => ({
              ...prev,
              mode,
              forcedItem:
                mode === "card" ? ALL_CARDS[0] : (prev.nameList[0] ?? ""),
              events: generateEvents(mode, prev.nameList),
              firstPickedDate: null,
              lockedForcedDate: null,
            }));
          }}
          onUpdateForcedItem={(item) =>
            setAppState((p) => ({ ...p, forcedItem: item }))
          }
          onAddName={(name) =>
            setAppState((p) => ({ ...p, nameList: [...p.nameList, name] }))
          }
          onRemoveName={(name) =>
            setAppState((p) => ({
              ...p,
              nameList: p.nameList.filter((n) => n !== name),
            }))
          }
          onReset={() => {
            setAppState((prev) => ({
              ...prev,
              events: generateEvents(prev.mode, prev.nameList),
              firstPickedDate: null,
              lockedForcedDate: null,
            }));
            setShowSettings(false);
          }}
        />
      )}

      {/* Secret Peek — upside-down date at bottom, 30% opacity */}
      {appState.firstPickedDate && view === "month" && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: 6,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 11,
            color: "#fff",
            opacity: 0.3,
            transform: "rotate(180deg)",
            pointerEvents: "none",
            zIndex: 999,
            letterSpacing: 1.5,
            fontWeight: 500,
          }}
        >
          {peekFormat(appState.firstPickedDate)}
        </div>
      )}
    </div>
  );
}

// ── MonthView ──────────────────────────────────────────────────────────────
interface MonthViewProps {
  year: number;
  month: number;
  todayStr: string;
  events: Record<string, string[]>;
  tapFeedback: string | null;
  onDateTap: (dateStr: string) => void;
  onMonthTitleTap: () => void;
  onPlusStart: () => void;
  onPlusEnd: () => void;
  onYearTap: () => void;
  onTodayTap: () => void;
}

function MonthView({
  year,
  month,
  todayStr,
  events,
  tapFeedback,
  onDateTap,
  onMonthTitleTap,
  onPlusStart,
  onPlusEnd,
  onYearTap,
  onTodayTap,
}: MonthViewProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Top nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px 6px",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ocid="nav.year_button"
          onClick={onYearTap}
          style={pillBtn}
        >
          <span style={{ fontSize: 17, lineHeight: 1, marginRight: 2 }}>‹</span>
          {year}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" data-ocid="nav.search_button" style={roundBtn}>
            <IconSearch />
          </button>
          <button
            type="button"
            data-ocid="nav.plus_button"
            style={roundBtn}
            onMouseDown={onPlusStart}
            onMouseUp={onPlusEnd}
            onMouseLeave={onPlusEnd}
            onTouchStart={onPlusStart}
            onTouchEnd={onPlusEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            +
          </button>
        </div>
      </div>

      {/* Month title — triple-tap → settings */}
      <button
        type="button"
        data-ocid="month.title"
        onClick={onMonthTitleTap}
        style={{
          background: "none",
          border: "none",
          padding: "2px 16px 10px",
          textAlign: "left",
          fontSize: 34,
          fontWeight: 700,
          color: "#fff",
          userSelect: "none",
          cursor: "default",
          flexShrink: 0,
          letterSpacing: -0.5,
          fontFamily: "inherit",
          WebkitTapHighlightColor: "transparent",
          width: "100%",
        }}
      >
        {MONTHS[month]}
      </button>

      {/* Weekday header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          padding: "0 10px 4px",
          flexShrink: 0,
        }}
      >
        {[
          { k: "sun", v: "S" },
          { k: "mon", v: "M" },
          { k: "tue", v: "T" },
          { k: "wed", v: "W" },
          { k: "thu", v: "T" },
          { k: "fri", v: "F" },
          { k: "sat", v: "S" },
        ].map(({ k, v }) => (
          <div
            key={k}
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#8E8E93",
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {v}
          </div>
        ))}
      </div>
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.1)",
          margin: "0 10px",
          flexShrink: 0,
        }}
      />

      {/* Calendar grid */}
      <div
        style={{
          flex: 1,
          padding: "0 10px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
        }}
      >
        {rows.map((row, ri) => {
          const rowFirstDay = row.find((d) => d !== null);
          const rowKey = rowFirstDay != null ? `row-${rowFirstDay}` : "row-pad";
          return (
            <div
              key={rowKey}
              style={{
                borderTop: ri > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                paddingTop: ri > 0 ? 2 : 0,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                }}
              >
                {row.map((day, ci) => {
                  if (!day) {
                    // biome-ignore lint/suspicious/noArrayIndexKey: empty calendar cells
                    return <div key={ci} />;
                  }
                  const dateStr = dk(year, month, day);
                  const isToday = dateStr === todayStr;
                  const dayEvs = events[dateStr] || [];
                  const isFeedback = tapFeedback === dateStr;
                  const isSunday = ci === 0;

                  return (
                    <button
                      type="button"
                      key={dateStr}
                      data-ocid={`calendar.day_cell.${ri * 7 + ci + 1}`}
                      onClick={() => onDateTap(dateStr)}
                      style={{
                        background: "none",
                        border: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "2px 0 4px",
                        cursor: "pointer",
                        transform: isFeedback ? "scale(0.82)" : "scale(1)",
                        opacity: isFeedback ? 0.65 : 1,
                        transition: "transform 0.15s ease, opacity 0.15s ease",
                        userSelect: "none",
                        WebkitTapHighlightColor: "transparent",
                        fontFamily: "inherit",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: isToday ? "#FF3B30" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 17,
                          fontWeight: isToday ? 700 : 400,
                          color: isToday
                            ? "#fff"
                            : isSunday
                              ? "rgba(255,255,255,0.5)"
                              : "#fff",
                        }}
                      >
                        {day}
                      </div>
                      {/* Event dots */}
                      <div
                        style={{
                          display: "flex",
                          gap: 2,
                          marginTop: 1,
                          height: 6,
                          alignItems: "center",
                        }}
                      >
                        {dayEvs.slice(0, 3).map((ev) => (
                          <div
                            key={ev}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: colorForEvent(ev),
                            }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px 28px",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ocid="nav.today_button"
          onClick={onTodayTap}
          style={pillBtn}
        >
          Today
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={roundBtn}>
            <IconCalGrid />
          </button>
          <button type="button" style={roundBtn}>
            <IconInbox />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper refs for the plus button — passed down as prop functions

// ── YearView ───────────────────────────────────────────────────────────────
interface YearViewProps {
  year: number;
  todayStr: string;
  events: Record<string, string[]>;
  onMonthTap: (month: number) => void;
  onBack: () => void;
  onPlusStart: () => void;
  onPlusEnd: () => void;
}

function YearView({
  year,
  todayStr,
  events,
  onMonthTap,
  onBack,
  onPlusStart,
  onPlusEnd,
}: YearViewProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px 6px",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ocid="nav.back_button"
          onClick={onBack}
          style={pillBtn}
        >
          <span style={{ fontSize: 17, lineHeight: 1, marginRight: 2 }}>‹</span>
          Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" data-ocid="nav.search_button" style={roundBtn}>
            <IconSearch />
          </button>
          <button
            type="button"
            data-ocid="nav.plus_button"
            style={roundBtn}
            onMouseDown={onPlusStart}
            onMouseUp={onPlusEnd}
            onMouseLeave={onPlusEnd}
            onTouchStart={onPlusStart}
            onTouchEnd={onPlusEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            +
          </button>
        </div>
      </div>

      {/* Year title */}
      <div
        style={{
          padding: "2px 16px 12px",
          fontSize: 34,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
          letterSpacing: -0.5,
        }}
      >
        {year}
      </div>

      {/* 12 mini calendars */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 12px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {Array.from({ length: 12 }, (_, m) => (
            <MiniMonth
              key={SHORT_MONTHS[m]}
              year={year}
              month={m}
              todayStr={todayStr}
              events={events}
              onTap={() => onMonthTap(m)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface MiniMonthProps {
  year: number;
  month: number;
  todayStr: string;
  events: Record<string, string[]>;
  onTap: () => void;
}

function MiniMonth({ year, month, todayStr, events, onTap }: MiniMonthProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        background: "#1C1C1E",
        borderRadius: 12,
        padding: "8px 6px 6px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        border: "none",
        fontFamily: "inherit",
        color: "inherit",
        width: "100%",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          marginBottom: 4,
          paddingLeft: 2,
        }}
      >
        {SHORT_MONTHS[month]}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          rowGap: 1,
        }}
      >
        {cells.map((day, idx) => {
          const cellKey = day ? dk(year, month, day) : `empty-${idx}`;
          if (!day) return <div key={cellKey} style={{ aspectRatio: "1" }} />;
          const dateStr = dk(year, month, day);
          const isToday = dateStr === todayStr;
          const hasEvs = (events[dateStr] || []).length > 0;
          return (
            <div
              key={cellKey}
              style={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: isToday ? 700 : 400,
                color: isToday ? "#fff" : "#8E8E93",
                background: isToday ? "#FF3B30" : "transparent",
                borderRadius: "50%",
                position: "relative",
              }}
            >
              {day}
              {hasEvs && !isToday && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "#34C759",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

// ── DayView ────────────────────────────────────────────────────────────────
interface DayViewProps {
  dateStr: string;
  events: string[];
  onBack: () => void;
  onTodayTap: () => void;
}

function DayView({ dateStr, events, onBack, onTodayTap }: DayViewProps) {
  const parts = dateStr.split("-").map(Number);
  const [, mo, da] = parts;
  const y = parts[0];
  const date = new Date(y, mo - 1, da);
  const dayName = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][date.getDay()];
  const monthName = MONTHS[mo - 1];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 16px 8px",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ocid="nav.back_button"
          onClick={onBack}
          style={pillBtn}
        >
          <span style={{ fontSize: 17, lineHeight: 1, marginRight: 2 }}>‹</span>
          {monthName}
        </button>
      </div>

      {/* Date title */}
      <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: -0.3,
          }}
        >
          {dayName} {da}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.1)",
          margin: "0 16px 4px",
          flexShrink: 0,
        }}
      />

      {/* Event list */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 16px" }}>
        {events.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#8E8E93",
              marginTop: 48,
              fontSize: 16,
            }}
          >
            No Events
          </div>
        ) : (
          events.map((ev, evPos) => {
            const evKey = `ev-${evPos}-${ev.length}`;
            const color = colorForEvent(ev);
            return (
              <div
                key={evKey}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  background: "#1C1C1E",
                  borderRadius: 10,
                  marginBottom: 8,
                  overflow: "hidden",
                  minHeight: 52,
                }}
              >
                <div style={{ width: 4, background: color, flexShrink: 0 }} />
                <div style={{ padding: "10px 12px", flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
                    {ev}
                  </div>
                  <div style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>
                    All Day
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom toolbar */}
      <div style={{ padding: "8px 16px 28px", flexShrink: 0 }}>
        <button
          type="button"
          data-ocid="nav.today_button"
          onClick={onTodayTap}
          style={pillBtn}
        >
          Today
        </button>
      </div>
    </div>
  );
}

// ── SettingsPanel ──────────────────────────────────────────────────────────
interface SettingsPanelProps {
  appState: AppState;
  onClose: () => void;
  onUpdateMode: (mode: Mode) => void;
  onUpdateForcedItem: (item: string) => void;
  onAddName: (name: string) => void;
  onRemoveName: (name: string) => void;
  onReset: () => void;
}

function SettingsPanel({
  appState,
  onClose,
  onUpdateMode,
  onUpdateForcedItem,
  onAddName,
  onRemoveName,
  onReset,
}: SettingsPanelProps) {
  const [newName, setNewName] = useState("");
  const items = appState.mode === "card" ? ALL_CARDS : appState.nameList;

  const sectionLabel: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#8E8E93",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  };

  const listContainer: CSSProperties = {
    background: "#2C2C2E",
    borderRadius: 10,
    overflow: "hidden",
    maxHeight: 200,
    overflowY: "auto",
  };

  return (
    <div
      data-ocid="settings.modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          background: "#1C1C1E",
          borderRadius: "20px 20px 0 0",
          height: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>
            Settings
          </div>
          <button
            type="button"
            data-ocid="settings.close_button"
            onClick={onClose}
            style={{
              ...roundBtn,
              background: "rgba(255,255,255,0.12)",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          {/* Mode selection */}
          <div style={{ marginBottom: 28 }}>
            <div style={sectionLabel}>Event Mode</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                data-ocid="settings.mode_card"
                onClick={() => onUpdateMode("card")}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  border: "none",
                  background: appState.mode === "card" ? "#FF3B30" : "#2C2C2E",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Card Mode
              </button>
              <button
                type="button"
                data-ocid="settings.mode_name"
                onClick={() => onUpdateMode("name")}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  border: "none",
                  background: appState.mode === "name" ? "#FF3B30" : "#2C2C2E",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Name Mode
              </button>
            </div>
          </div>

          {/* Force selection */}
          <div style={{ marginBottom: 28 }}>
            <div style={sectionLabel}>Force Selection</div>
            <div style={listContainer}>
              {items.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => onUpdateForcedItem(item)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    background:
                      appState.forcedItem === item
                        ? "rgba(255,59,48,0.15)"
                        : "transparent",
                    color: "#fff",
                    fontSize: 15,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span>{item}</span>
                  {appState.forcedItem === item && (
                    <span
                      style={{
                        color: "#FF3B30",
                        fontSize: 17,
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name list editor */}
          {appState.mode === "name" && (
            <div style={{ marginBottom: 28 }}>
              <div style={sectionLabel}>Name List</div>
              <div style={{ ...listContainer, marginBottom: 10 }}>
                {appState.nameList.map((name) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span style={{ fontSize: 15, color: "#fff" }}>{name}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveName(name)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#FF3B30",
                        fontSize: 20,
                        cursor: "pointer",
                        padding: 0,
                        lineHeight: 1,
                        fontFamily: "inherit",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  data-ocid="settings.add_name_input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      onAddName(newName.trim());
                      setNewName("");
                    }
                  }}
                  placeholder="Add name..."
                  style={{
                    flex: 1,
                    background: "#2C2C2E",
                    border: "none",
                    color: "#fff",
                    padding: "11px 14px",
                    borderRadius: 10,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  data-ocid="settings.add_name_button"
                  onClick={() => {
                    if (newName.trim()) {
                      onAddName(newName.trim());
                      setNewName("");
                    }
                  }}
                  style={{
                    background: "#FF3B30",
                    border: "none",
                    color: "#fff",
                    padding: "11px 18px",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            type="button"
            data-ocid="settings.reset_button"
            onClick={onReset}
            style={{
              width: "100%",
              padding: "14px",
              background: "#FF3B30",
              border: "none",
              color: "#fff",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}

// Suppress unused variable warnings for placeholders

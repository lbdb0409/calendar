export type EntryStatus = "planned" | "logged";

export type Entry = {
  id: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM (24h)
  endTime: string;     // HH:MM (24h)
  notes?: string;
  status: EntryStatus;
  createdAt: string;
};

export type UniBlock = {
  id: string;
  date: string;        // YYYY-MM-DD
  startTime: string;
  endTime: string;
  label?: string;
};

export type Settings = {
  hourlyRate: number;
  weeklyTarget: number;
  dadEmail?: string;
  dadName?: string;
  myName?: string;
  shareToken: string;
};

export type Payment = {
  id: string;
  date: string;       // YYYY-MM-DD
  amount: number;     // AUD
  note?: string;
  createdAt: string;
};

export type ActiveTimer = {
  startedAt: string;  // ISO timestamp
};

export type AppState = {
  settings: Settings;
  entries: Entry[];
  uniBlocks: UniBlock[];
  payments: Payment[];
  timer: ActiveTimer | null;
};

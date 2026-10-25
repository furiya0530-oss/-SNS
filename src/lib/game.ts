// ゲームのルール本体。画面や保存方法に依存しない関数だけを置く（テストしやすくするため）。
import {
  ANSWER_LIMIT_MS,
  DEMOTION_BACKLOG,
  EXAM_UNLOCK_CORRECT,
  OPEN_GRACE_MS,
  SCHEDULE_DAYS,
} from './rules';
import type { Delivery, ExamRecord, GameState, Question, Settings } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
/** 役員（6）の昇進試験に合格すると 7 = 社長（ゴール） */
export const MAX_STAGE = 6;

export const defaultSettings: Settings = {
  dailyCount: 3,
  windows: [
    { label: '通勤', start: '07:30', end: '08:30' },
    { label: '昼休み', start: '12:00', end: '13:00' },
    { label: '夜', start: '20:00', end: '22:00' },
  ],
  weekends: true,
  holidayMode: false,
};

export function createInitialState(userId: string, now: number): GameState {
  return {
    version: 1,
    userId,
    stage: 1,
    stageStartedAt: now,
    settings: defaultSettings,
    deliveries: [],
    exams: [],
    holidayDays: [],
  };
}

/** 端末の時刻での日付キー（YYYY-MM-DD） */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h * 60 + m) * 60 * 1000;
}

export function isWeekend(ts: number): boolean {
  const day = new Date(ts).getDay();
  return day === 0 || day === 6;
}

/**
 * 1日分の出題時刻を、設定した時間帯の中からランダムに決める。
 * 時間帯を順番に使い、各時間帯の中で時刻をランダムに選ぶ。
 */
export function planDayTimes(settings: Settings, dayStart: number, rand: () => number): number[] {
  if (settings.holidayMode || settings.windows.length === 0) return [];
  if (!settings.weekends && isWeekend(dayStart)) return [];
  const times: number[] = [];
  for (let i = 0; i < settings.dailyCount; i++) {
    const w = settings.windows[i % settings.windows.length];
    const start = parseHM(w.start);
    const end = Math.max(parseHM(w.end), start + 60 * 1000);
    times.push(dayStart + start + Math.floor(rand() * (end - start)));
  }
  return times.sort((a, b) => a - b);
}

/**
 * これから届く出題を、SCHEDULE_DAYS 日先まで作る。
 * replan = true（設定を変えたとき）は、まだ届いていない出題を作り直す。
 */
export function planDeliveries(
  state: GameState,
  now: number,
  rand: () => number,
  pool: Question[],
  newId: () => string,
  replan = false,
): GameState {
  const today = startOfDay(now);
  let deliveries = state.deliveries;
  let from = Math.max(state.plannedUntil ?? today, today);
  if (replan) {
    deliveries = deliveries.filter((d) => d.scheduledAt <= now || d.answeredAt !== undefined || d.openedAt !== undefined);
    from = today;
  } else if (!deliveries.some((d) => d.scheduledAt > now)) {
    // 予定が何かの理由で消えていたら、今日から作り直す
    from = today;
  }
  const until = startOfDay(today + SCHEDULE_DAYS * DAY_MS + DAY_MS / 2);
  const planned = new Set(deliveries.filter((d) => d.scheduledAt > now).map((d) => d.questionId));
  const added: Delivery[] = [];
  for (let t = from + DAY_MS / 2; t < until; t += DAY_MS) {
    for (const at of planDayTimes(state.settings, startOfDay(t), rand)) {
      if (at <= now) continue;
      const q = pickQuestion(pool, [...deliveries, ...added], state.stage, rand, planned);
      if (!q) continue;
      planned.add(q.id);
      added.push({ id: newId(), userId: state.userId, questionId: q.id, stage: state.stage, unit: q.unit, scheduledAt: at });
    }
  }
  return { ...state, deliveries: [...deliveries, ...added], plannedUntil: until };
}

/** まだ届いていない出題（通知を予約するもの） */
export function upcoming(state: GameState, now: number): Delivery[] {
  return state.deliveries
    .filter((d) => d.scheduledAt > now && d.answeredAt === undefined && !d.expired)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/** 休日モード中なら今日を休日として記録する（出勤記録が途切れないように） */
export function markHoliday(state: GameState, now: number): GameState {
  const today = dayKey(now);
  if (!state.settings.holidayMode || state.holidayDays.includes(today)) return state;
  return { ...state, holidayDays: [...state.holidayDays, today] };
}

/**
 * アプリを開いたときや設定を変えたときの更新。
 * 休日の記録 → 降格の判定 → 出題予定の作成 の順に行う。
 * ステージが変わったら、まだ届いていない出題は新しいステージの問題で作り直す。
 */
export function refresh(
  state: GameState,
  now: number,
  rand: () => number,
  pool: Question[],
  newId: () => string,
  replan = false,
): GameState {
  const s = applyDemotion(markHoliday(state, now), now);
  const stageChanged = upcoming(s, now).some((d) => d.stage !== s.stage);
  return planDeliveries(s, now, rand, pool, newId, replan || stageChanged);
}

/** 未処理案件: 通知の時刻を過ぎたのに答えていない出題 */
export function backlog(state: GameState, now: number): Delivery[] {
  return state.deliveries.filter((d) => d.scheduledAt <= now && d.answeredAt === undefined && !d.expired);
}

/** 未処理案件が上限に達していたら降格させる。溜まっていた案件は片付けて、やり直せるようにする。 */
export function applyDemotion(state: GameState, now: number): GameState {
  const pending = backlog(state, now);
  if (pending.length < DEMOTION_BACKLOG) return state;
  const ids = new Set(pending.map((d) => d.id));
  const stage = Math.max(1, state.stage - 1);
  return {
    ...state,
    stage,
    stageStartedAt: stage === state.stage ? state.stageStartedAt : now,
    deliveries: state.deliveries.map((d) => (ids.has(d.id) ? { ...d, expired: true } : d)),
    notice: { kind: 'demoted', stage, at: now },
  };
}

/**
 * 出題する問題を選ぶ。まだ出ていない問題 → 間違えた問題 → 出題が古い問題の順に優先する。
 * 今のステージの問題がなければ、それまでのステージの問題で復習する。
 */
export function pickQuestion(
  pool: Question[],
  deliveries: Delivery[],
  stage: number,
  rand: () => number,
  exclude: Set<string> = new Set(),
): Question | undefined {
  let candidates = pool.filter((q) => q.stage === stage);
  if (candidates.length === 0) candidates = pool.filter((q) => q.stage < stage);
  if (candidates.length === 0) candidates = pool;
  const notExcluded = candidates.filter((q) => !exclude.has(q.id));
  if (notExcluded.length > 0) candidates = notExcluded;
  if (candidates.length === 0) return undefined;

  const lastSeen = new Map<string, number>();
  const wrong = new Set<string>();
  for (const d of deliveries) {
    lastSeen.set(d.questionId, Math.max(lastSeen.get(d.questionId) ?? 0, d.scheduledAt));
    if (d.correct === false) wrong.add(d.questionId);
  }
  const score = (q: Question) => {
    if (!lastSeen.has(q.id)) return 0;
    if (wrong.has(q.id)) return 1;
    return 2;
  };
  const best = Math.min(...candidates.map(score));
  let top = candidates.filter((q) => score(q) === best);
  if (best === 2) {
    const oldest = Math.min(...top.map((q) => lastSeen.get(q.id) ?? 0));
    top = top.filter((q) => lastSeen.get(q.id) === oldest);
  }
  return top[Math.floor(rand() * top.length)];
}

/** 出題画面を開いた時刻を記録する（最初の1回だけ） */
export function markOpened(state: GameState, deliveryId: string, now: number): GameState {
  return {
    ...state,
    deliveries: state.deliveries.map((d) =>
      d.id === deliveryId && d.openedAt === undefined ? { ...d, openedAt: now } : d,
    ),
  };
}

/** 遅刻かどうか: 開いてから60秒を超えて回答した、または通知から30分以上たって開いた */
export function isLate(d: Delivery, answeredAt: number): boolean {
  const openedAt = d.openedAt ?? answeredAt;
  return answeredAt - openedAt > ANSWER_LIMIT_MS || openedAt - d.scheduledAt > OPEN_GRACE_MS;
}

export function answerDelivery(
  state: GameState,
  deliveryId: string,
  question: Question,
  choiceIndex: number,
  now: number,
): GameState {
  return {
    ...state,
    deliveries: state.deliveries.map((d) => {
      if (d.id !== deliveryId || d.answeredAt !== undefined) return d;
      return {
        ...d,
        answeredAt: now,
        choiceIndex,
        correct: choiceIndex === question.answerIndex,
        late: isLate(d, now),
      };
    }),
  };
}

export function answered(state: GameState): Delivery[] {
  return state.deliveries.filter((d) => d.answeredAt !== undefined);
}

/**
 * 出勤記録（連続回答日数）。
 * 今日はまだ答えていなくても途切れない。休日モードの日と、出題がなかった日も途切れない。
 */
export function streak(state: GameState, now: number): number {
  const answeredDays = new Set(answered(state).map((d) => dayKey(d.answeredAt!)));
  const scheduledDays = new Set(state.deliveries.filter((d) => d.scheduledAt <= now).map((d) => dayKey(d.scheduledAt)));
  const holidays = new Set(state.holidayDays);
  const firstDay = state.deliveries.length
    ? startOfDay(Math.min(...state.deliveries.map((d) => d.scheduledAt)))
    : startOfDay(now);
  let count = 0;
  // 夏時間などで1日の長さがずれても大丈夫なよう、正午を基準に1日ずつさかのぼる
  for (let t = startOfDay(now) + DAY_MS / 2, i = 0; t >= firstDay && i < 3660; t -= DAY_MS, i++) {
    const key = dayKey(t);
    if (answeredDays.has(key)) {
      count++;
    } else if (i === 0 || holidays.has(key) || !scheduledDays.has(key)) {
      continue;
    } else {
      break;
    }
  }
  return count;
}

/** 今のステージになってから正解した数（昇進試験の受験資格に使う） */
export function stageCorrectCount(state: GameState): number {
  return answered(state).filter((d) => d.correct && d.stage === state.stage && d.answeredAt! >= state.stageStartedAt)
    .length;
}

export function canTakeExam(state: GameState): boolean {
  return state.stage <= MAX_STAGE && stageCorrectCount(state) >= EXAM_UNLOCK_CORRECT;
}

/** そのステージで間違えた回数が多い単元（多い順） */
export function weakUnits(state: GameState, stage: number): string[] {
  const counts = new Map<string, number>();
  for (const d of answered(state)) {
    if (d.stage === stage && d.correct === false) counts.set(d.unit, (counts.get(d.unit) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([unit]) => unit);
}

/** 昇進試験の結果を記録し、合格なら昇進させる */
export function recordExam(state: GameState, exam: ExamRecord, now: number): GameState {
  const next: GameState = { ...state, exams: [...state.exams, exam] };
  if (!exam.passed || state.stage > MAX_STAGE) return next;
  const stage = state.stage + 1;
  return { ...next, stage, stageStartedAt: now, notice: { kind: 'promoted', stage, at: now } };
}

export type DayStats = { day: string; total: number; correct: number; late: number; missed: number };

export function dayStats(state: GameState, day: string, now: number): DayStats {
  const ofDay = state.deliveries.filter((d) => d.scheduledAt <= now && dayKey(d.scheduledAt) === day);
  const done = answered(state).filter((d) => dayKey(d.answeredAt!) === day);
  return {
    day,
    total: done.length,
    correct: done.filter((d) => d.correct).length,
    late: done.filter((d) => d.late).length,
    missed: ofDay.filter((d) => d.answeredAt === undefined).length,
  };
}

/** 今日の文法ログ: 今日答えた出題（新しい順） */
export function todayLog(state: GameState, now: number): Delivery[] {
  const today = dayKey(now);
  return answered(state)
    .filter((d) => dayKey(d.answeredAt!) === today)
    .sort((a, b) => b.answeredAt! - a.answeredAt!);
}

export type UnitStats = { unit: string; total: number; correct: number };

/** 今週の成績表（月曜はじまり） */
export function weeklyReport(state: GameState, now: number): { days: DayStats[]; units: UnitStats[] } {
  const today = startOfDay(now);
  const fromMonday = (new Date(today).getDay() + 6) % 7;
  const days: DayStats[] = [];
  for (let i = 0; i < 7; i++) {
    const t = today - (fromMonday - i) * DAY_MS + DAY_MS / 2;
    days.push(dayStats(state, dayKey(t), now));
  }
  const keys = new Set(days.map((d) => d.day));
  const units = new Map<string, UnitStats>();
  for (const d of answered(state)) {
    if (!keys.has(dayKey(d.answeredAt!))) continue;
    const u = units.get(d.unit) ?? { unit: d.unit, total: 0, correct: 0 };
    u.total++;
    if (d.correct) u.correct++;
    units.set(d.unit, u);
  }
  return { days, units: [...units.values()] };
}

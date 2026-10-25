// アプリで扱うデータの形

/** 4択の穴埋め問題 */
export type Question = {
  id: string;
  stage: number;
  unit: string;
  /** ビジネス場面（メール、会議、出張など） */
  scene: string;
  /** 空欄は ____ で表す */
  sentence: string;
  choices: string[];
  answerIndex: number;
  /** 上司キャラによる1〜2行の解説 */
  explanation: string;
};

/**
 * 1回の出題（通知1回ぶん）。
 * 将来の全国一斉出題・グループ機能に備え、ユーザーID・出題ID・回答時刻を必ず持つ。
 */
export type Delivery = {
  id: string;
  userId: string;
  questionId: string;
  stage: number;
  unit: string;
  /** 通知が届く（届いた）時刻 */
  scheduledAt: number;
  /** 出題画面を開いた時刻 */
  openedAt?: number;
  /** 回答時刻 */
  answeredAt?: number;
  choiceIndex?: number;
  correct?: boolean;
  /** 遅刻マーク */
  late?: boolean;
  /** 降格の際に処理済みとして片付けられた */
  expired?: boolean;
};

/** 昇進試験の結果 */
export type ExamRecord = {
  id: string;
  userId: string;
  stage: number;
  takenAt: number;
  score: number;
  total: number;
  passed: boolean;
  /** 間違えた問題の単元 */
  wrongUnits: string[];
};

export type TimeWindow = {
  label: string;
  /** "HH:MM" */
  start: string;
  end: string;
};

export type Settings = {
  dailyCount: number;
  windows: TimeWindow[];
  /** 土日も出題する */
  weekends: boolean;
  /** 休日モード（通知を止め、出勤記録も途切れない） */
  holidayMode: boolean;
};

/** 上司から伝える知らせ（昇進・降格） */
export type Notice = {
  kind: 'promoted' | 'demoted';
  stage: number;
  at: number;
};

export type GameState = {
  version: 1;
  userId: string;
  stage: number;
  /** 今のステージになった時刻 */
  stageStartedAt: number;
  settings: Settings;
  deliveries: Delivery[];
  exams: ExamRecord[];
  /** 休日モードだった日（YYYY-MM-DD） */
  holidayDays: string[];
  /** この日（0時）より前の日は出題予定を作成済み */
  plannedUntil?: number;
  notice?: Notice;
};

// ゲームのルールで使う数値（未決事項の仮の値）。ここを変えれば挙動が変わる。

/** 1問の制限時間 */
export const ANSWER_LIMIT_MS = 60 * 1000;
/** 通知からこれ以上たってから開くと遅刻 */
export const OPEN_GRACE_MS = 30 * 60 * 1000;
/** 未処理案件がこの数に達すると降格 */
export const DEMOTION_BACKLOG = 10;
/** 今のステージでこの数だけ正解すると昇進試験を受けられる */
export const EXAM_UNLOCK_CORRECT = 10;
/** 昇進試験の問題数と合格ライン */
export const EXAM_QUESTION_COUNT = 10;
export const EXAM_PASS_SCORE = 8;
/** 何日先まで通知を予約しておくか */
export const SCHEDULE_DAYS = 7;

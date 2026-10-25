// 上司キャラのセリフ
export const BOSS_NAME = '田中部長';

export function pick<T>(list: T[], rand: () => number = Math.random): T {
  return list[Math.floor(rand() * list.length)];
}

export const lines = {
  correct: ['よし、正解だ。その調子で頼むぞ。', '見事だ。仕事が早いな。', '正解。取引先にも安心して任せられる。'],
  wrong: ['惜しいな。解説を読んで次に活かせ。', '間違いは成長のチャンスだ。もう一度確認しておけ。'],
  late: ['正解でも遅刻は遅刻だ。次は60秒以内に頼む。', '返事が遅いぞ。業務連絡はすぐ返すのが鉄則だ。'],
};

export type BossSituation = {
  stageTitle: string;
  backlog: number;
  backlogLimit: number;
  answeredToday: number;
  correctToday: number;
  holidayMode: boolean;
  streak: number;
};

/** オフィス画面で上司が話しかけるセリフ */
export function greeting(s: BossSituation, rand: () => number = Math.random): string {
  if (s.holidayMode) return '今日は休日だな。しっかり休んで、また明日から頼むぞ。';
  if (s.backlog >= s.backlogLimit - 3) {
    return `未処理案件が ${s.backlog} 件も溜まっているぞ！ ${s.backlogLimit} 件になったら降格だ。今すぐ片付けてくれ。`;
  }
  if (s.backlog > 0) {
    return pick(
      [
        `未処理案件が ${s.backlog} 件あるぞ。返事を待っている人がいるんだ。`,
        `${s.backlog} 件、まだ返事がもらえていないな。手が空いたら頼む。`,
      ],
      rand,
    );
  }
  if (s.answeredToday > 0 && s.correctToday === s.answeredToday) {
    return pick([`今日は全問正解だな。${s.stageTitle}として申し分ない。`, '今日の仕事ぶり、しっかり見ていたぞ。'], rand);
  }
  if (s.answeredToday > 0) return '今日もよく出勤した。間違えたところは文法ログで見直しておけ。';
  if (s.streak >= 3) return `${s.streak} 日連続出勤か。継続は力なり、だ。今日も業務連絡を待っていてくれ。`;
  return pick(['今日も業務連絡を送るから、通知が来たら60秒以内に返事をくれ。', 'おはよう。今日も一日、よろしく頼むぞ。'], rand);
}

export function noticeLine(kind: 'promoted' | 'demoted', title: string): string {
  return kind === 'promoted'
    ? `昇進おめでとう！ 今日からキミは${title}だ。期待しているぞ。`
    : `残念だが、未処理案件が溜まりすぎた。${title}からやり直しだ。溜まっていた案件はこちらで片付けておいた。`;
}

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

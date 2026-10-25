// 毎日の出題に使う、事前に作成した問題。ステージを追加したらここに読み込みを足す。
import type { Question } from '../../lib/types';
import stage1 from './stage1.json';

export const questionPool: Question[] = [...(stage1 as Question[])];

export function findQuestion(id: string): Question | undefined {
  return questionPool.find((q) => q.id === id);
}

// 昇進試験の問題を、Supabase Edge Function 経由で Claude API に作ってもらう
import type { Question } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const examConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export type ExamRequest = {
  stage: number;
  stageTitle: string;
  units: string[];
  weakUnits: string[];
  count: number;
};

export async function fetchExamQuestions(req: ExamRequest): Promise<Question[]> {
  if (!examConfigured) throw new Error('Supabase の設定（.env）がまだありません');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-exam`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(req),
  });
  const body = (await res.json().catch(() => null)) as
    | { questions?: Omit<Question, 'id' | 'stage'>[]; error?: string }
    | null;
  if (!res.ok || !body?.questions) throw new Error(body?.error ?? `サーバーエラー（${res.status}）`);
  return body.questions.map((q, i) => ({ ...q, id: `exam-${Date.now()}-${i}`, stage: req.stage }));
}

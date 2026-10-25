// 昇進試験の問題を Claude API で作る Supabase Edge Function（Deno で動く）。
// APIキーはアプリに置かず、Supabase の秘密情報 ANTHROPIC_API_KEY に登録して使う。
import Anthropic from 'npm:@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const MAX_ROUNDS = 3;

type ExamRequest = {
  stage: number;
  stageTitle: string;
  units: string[];
  weakUnits: string[];
  count: number;
};

type ExamQuestion = {
  unit: string;
  scene: string;
  sentence: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const questionSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          unit: { type: 'string' },
          scene: { type: 'string' },
          sentence: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' } },
          answerIndex: { type: 'integer' },
          explanation: { type: 'string' },
        },
        required: ['unit', 'scene', 'sentence', 'choices', 'answerIndex', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

const verifySchema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          correctChoices: { type: 'array', items: { type: 'integer' } },
          reason: { type: 'string' },
        },
        required: ['index', 'correctChoices', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

/** Claude に JSON で答えさせ、その JSON を返す */
async function askJson<T>(prompt: string, schema: Record<string, unknown>, effort: 'medium' | 'high'): Promise<T> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // 安全上の理由で断られたときは、サーバー側で推奨モデルに切り替えてもらう
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort, format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') throw new Error('AIが問題の作成を断りました');
  if (response.stop_reason === 'max_tokens') throw new Error('AIの出力が長すぎて途中で切れました');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('AIの応答にテキストがありません');
  return JSON.parse(text.text) as T;
}

/** 出題する単元の割り振り。間違えた単元を多めにする */
function planUnits(units: string[], weakUnits: string[], count: number): string[] {
  const weighted = [...weakUnits.filter((u) => units.includes(u)), ...units];
  const plan: string[] = [];
  for (let i = 0; i < count; i++) plan.push(weighted[i % weighted.length]);
  return plan;
}

function generatePrompt(req: ExamRequest, units: string[]): string {
  return `あなたはTOEIC対策教材の作問者です。日本の社会人向けに、中学レベルの英文法を復習する4択の穴埋め問題（TOEIC Part 5 形式）を ${units.length} 問作ってください。

これは会社員RPG風アプリの「${req.stageTitle}」ステージの昇進試験です。
各問の単元（この順番で1問ずつ）:
${units.map((u, i) => `${i + 1}. ${u}`).join('\n')}

条件:
- 例文はすべてオフィスの場面（メール、会議、出張、電話、報告書など）にする。scene には場面を日本語で短く書く（例: 社内メール）
- sentence は英文1文で、空欄を「____」（アンダースコア4つ）で1か所だけ示す
- choices は4つ。文法的にも意味的にも正解が1つだけになるようにし、ほかの3つは明確に誤りにする
- answerIndex は正解の選択肢の番号（0〜3）。正解の位置は問題ごとにばらつかせる
- explanation は上司キャラ「田中部長」の口調（「〜だ」「〜だぞ」）で、なぜその答えになるかを日本語1〜2文で説明する
- unit には指定した単元名をそのまま書く
- 中学で習う語彙を中心にし、難しすぎる単語は避ける`;
}

function verifyPrompt(questions: ExamQuestion[]): string {
  const list = questions
    .map((q, i) => `${i}. ${q.sentence}\n   ${q.choices.map((c, j) => `(${j}) ${c}`).join('  ')}`)
    .join('\n');
  return `次の英文法の4択穴埋め問題を、自分で解いて検証してください。正解は示しません。
各問について、空欄に入れて文法的にも意味的にも正しい英文になる選択肢の番号を、すべて correctChoices に入れてください（正しいものが1つもなければ空の配列、2つ以上あればすべて）。reason には判断理由を日本語で短く書いてください。

${list}`;
}

/** 形のチェック（選択肢4つ・重複なし・空欄あり・正解番号が範囲内） */
function wellFormed(q: ExamQuestion, unit: string): boolean {
  return (
    q.unit === unit &&
    q.sentence.split('____').length === 2 &&
    q.choices.length === 4 &&
    new Set(q.choices.map((c) => c.trim().toLowerCase())).size === 4 &&
    Number.isInteger(q.answerIndex) &&
    q.answerIndex >= 0 &&
    q.answerIndex < 4
  );
}

async function createExam(req: ExamRequest): Promise<ExamQuestion[]> {
  const plan = planUnits(req.units, req.weakUnits, req.count);
  const accepted: (ExamQuestion | undefined)[] = plan.map(() => undefined);
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const missing = plan.map((u, i) => ({ u, i })).filter(({ i }) => !accepted[i]);
    if (missing.length === 0) break;
    // 1段階目: 問題を作る
    const generated = await askJson<{ questions: ExamQuestion[] }>(
      generatePrompt(req, missing.map((m) => m.u)),
      questionSchema,
      'medium',
    );
    const candidates = missing
      .map((m, j) => ({ ...m, q: generated.questions[j] }))
      .filter((c) => c.q && wellFormed(c.q, c.u));
    if (candidates.length === 0) continue;
    // 2段階目: 別の呼び出しで、正解が1つだけかを検証する
    const verified = await askJson<{ results: { index: number; correctChoices: number[] }[] }>(
      verifyPrompt(candidates.map((c) => c.q)),
      verifySchema,
      'high',
    );
    candidates.forEach((c, j) => {
      const r = verified.results.find((x) => x.index === j);
      if (r && r.correctChoices.length === 1 && r.correctChoices[0] === c.q.answerIndex) accepted[c.i] = c.q;
    });
  }
  const done = accepted.filter((q): q is ExamQuestion => q !== undefined);
  if (done.length < req.count) throw new Error(`検証に合格した問題が足りません（${done.length}/${req.count}）`);
  return done;
}

function parseRequest(body: unknown): ExamRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (typeof b.stage !== 'number' || typeof b.stageTitle !== 'string' || !strings(b.units) || !strings(b.weakUnits)) {
    return null;
  }
  const units = b.units as string[];
  if (units.length === 0 || units.length > 10) return null;
  const count = typeof b.count === 'number' ? Math.min(Math.max(Math.floor(b.count), 1), 15) : 10;
  return { stage: b.stage, stageTitle: b.stageTitle, units, weakUnits: b.weakUnits as string[], count };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const req = parseRequest(await request.json().catch(() => null));
  if (!req) return json({ error: 'リクエストの形が正しくありません' }, 400);
  try {
    return json({ questions: await createExam(req) });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : '問題を作れませんでした' }, 500);
  }
});

// 6つの役職ステージと単元。単元ごとに上司キャラの解説文をつける。

export type Unit = {
  name: string;
  /** 上司キャラが話す短い解説文 */
  lecture: string;
};

export type Stage = {
  id: number;
  title: string;
  units: Unit[];
};

export const stages: Stage[] = [
  {
    id: 1,
    title: '新入社員',
    units: [
      {
        name: 'be動詞と一般動詞',
        lecture:
          '英語の文は「be動詞」か「一般動詞」のどちらかが軸だ。1つの文に両方は並べない。主語が3人称単数で現在の話なら、一般動詞には s をつけるんだぞ。',
      },
      {
        name: '名詞の単数・複数',
        lecture:
          '2つ以上なら複数形。ただし information や equipment、advice は数えられない名詞だから s がつかない。TOEICで狙われやすいところだ。',
      },
      {
        name: '代名詞',
        lecture:
          'I / my / me / mine の使い分けだ。主語なら I、名詞の前なら my、動詞や前置詞の後ろなら me、「私のもの」なら mine。位置で決まると覚えておけ。',
      },
    ],
  },
  {
    id: 2,
    title: '主任',
    units: [
      {
        name: '時制',
        lecture:
          'いつの話かで動詞の形が変わる。yesterday なら過去、next week なら未来、now なら進行形。時を表す言葉を見つけるのが先決だ。',
      },
      {
        name: '主語と動詞の一致',
        lecture:
          '主語が単数か複数かで動詞が変わる。The manager of the sales teams のように修飾語が長いと迷うが、主語の中心は manager だ。',
      },
      {
        name: '品詞の基本',
        lecture:
          '名詞・動詞・形容詞・副詞の役割を押さえろ。名詞の前には形容詞、動詞を説明するのは副詞。空欄の前後を見れば品詞は決まる。',
      },
    ],
  },
  {
    id: 3,
    title: '係長',
    units: [
      {
        name: '助動詞',
        lecture:
          'can / must / should / will などは動詞の前に置いて意味を足す。助動詞の後ろの動詞は必ず原形だ。報告書でも会議でも頻繁に使うぞ。',
      },
      {
        name: '前置詞',
        lecture:
          '時間なら at 9:00、on Monday、in April。場所なら at the station、in the office。後ろに名詞が来るのが前置詞だ。',
      },
      {
        name: '接続詞',
        lecture:
          'and / but / because / although は文と文をつなぐ。理由なら because、逆接なら although。つなぐ前後の関係を読み取れ。',
      },
      {
        name: '前置詞と接続詞の区別',
        lecture:
          'during と while はどちらも「〜の間」だが、during の後ろは名詞、while の後ろは主語と動詞。Part 5 の頻出問題だ、後ろの形を見て判断しろ。',
      },
      {
        name: '品詞の見分け方',
        lecture:
          '語尾で品詞がわかる。-tion / -ment は名詞、-ive / -ful は形容詞、-ly は副詞。単語の意味がわからなくても解ける問題は多いぞ。',
      },
    ],
  },
  {
    id: 4,
    title: '課長',
    units: [
      {
        name: '不定詞',
        lecture:
          'to + 動詞の原形で「〜すること」「〜するために」「〜するための」を表す。plan to、decide to のように後ろに to をとる動詞を押さえておけ。',
      },
      {
        name: '動名詞',
        lecture:
          '動詞の ing 形で「〜すること」。enjoy、finish、consider の後ろは動名詞だ。look forward to の to の後ろも ing だから気をつけろ。',
      },
      {
        name: '比較',
        lecture:
          '2つを比べるなら -er / more、3つ以上で一番なら -est / most。than があれば比較級、the と of / in があれば最上級を疑え。',
      },
    ],
  },
  {
    id: 5,
    title: '部長',
    units: [
      {
        name: '受動態',
        lecture:
          '「〜される」は be動詞 + 過去分詞。主語が動作をするのか、されるのかを考えろ。The report was submitted のように、ビジネス文書では多用されるぞ。',
      },
      {
        name: '現在完了',
        lecture:
          'have + 過去分詞で、過去から今につながる話をする。since や for、already、yet が目印だ。yesterday のような過去の時点とは一緒に使えない。',
      },
    ],
  },
  {
    id: 6,
    title: '役員',
    units: [
      {
        name: '分詞',
        lecture:
          '名詞を説明する ing 形と過去分詞だ。「〜している」なら ing、「〜された」なら過去分詞。the attached file は「添付されたファイル」だな。',
      },
      {
        name: '関係代名詞',
        lecture:
          'who / which / that で名詞に説明をつなげる。人なら who、物なら which。後ろに主語が欠けているか、目的語が欠けているかで形が決まる。',
      },
      {
        name: '仮定法',
        lecture:
          '事実と違うことを言うときは時制を1つ過去にずらす。If I were you, I would ... は交渉や助言の場面で使える表現だ。ここまで来たら役員の器だな。',
      },
    ],
  },
];

/** 役員の昇進試験に合格したときの役職 */
export const FINAL_TITLE = '社長';

export function stageTitle(stage: number): string {
  return stages.find((s) => s.id === stage)?.title ?? FINAL_TITLE;
}

export function getStage(stage: number): Stage | undefined {
  return stages.find((s) => s.id === stage);
}

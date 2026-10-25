/// <reference types="node" />
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { stages } from '../../data/stages';
import { questionPool } from '../../data/questions';

it('問題データの形が正しい（選択肢4つ・正解の番号・単元名・IDの重複なし）', () => {
  const ids = new Set<string>();
  for (const q of questionPool) {
    assert.ok(!ids.has(q.id), `IDが重複: ${q.id}`);
    ids.add(q.id);
    assert.equal(q.choices.length, 4, q.id);
    assert.equal(new Set(q.choices).size, 4, `選択肢が重複: ${q.id}`);
    assert.ok(q.answerIndex >= 0 && q.answerIndex < 4, q.id);
    assert.ok(q.sentence.includes('____'), `空欄がない: ${q.id}`);
    const stage = stages.find((s) => s.id === q.stage);
    assert.ok(stage?.units.some((u) => u.name === q.unit), `単元名がステージにない: ${q.id}`);
  }
});

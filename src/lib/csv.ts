import Papa from 'papaparse'

/**
 * CSV の入出力まわりの共通処理。
 *
 * Excel (Windows) で開いたときに文字化けしないよう、
 * 書き出しは UTF-8 with BOM にする。
 */

/** Excel が UTF-8 と判断するための BOM */
const BOM = '﻿'

/** 行の配列を CSV 文字列にする。 */
export function toCsv(rows: Record<string, string>[]): string {
  return Papa.unparse(rows, { newline: '\r\n' })
}

/** CSV 文字列をブラウザでダウンロードさせる。 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()

  // ダウンロードは非同期に始まるので、その場で revoke するとファイル名が
  // 失われたり保存自体に失敗することがある。少し待ってから片付ける。
  setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 1000)
}

/** ファイル名に使う日付 (20260816) */
export function csvDateSuffix(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export interface ParsedCsv {
  rows: Record<string, string>[]
  /** 1行目のヘッダー */
  headers: string[]
}

/**
 * アップロードされた CSV を読み込む。
 * BOM 付きでも列名がずれないように除去する。
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      // BOM や前後の空白で列名が一致しなくなるのを防ぐ
      transformHeader: (header) => header.replace(/^﻿/, '').trim(),
      transform: (value) => value.trim(),
      complete: (result) => {
        resolve({
          rows: result.data,
          headers: (result.meta.fields ?? []).map((f) => f.trim()),
        })
      },
      error: (error: Error) => reject(error),
    })
  })
}

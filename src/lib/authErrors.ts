import { AuthError } from '@supabase/supabase-js'

/**
 * Supabase Auth のエラーメッセージは英語で返ってくるので、
 * よくあるものだけ日本語にする。未知のものはそのまま表示する。
 */
const messages: Record<string, string> = {
  invalid_credentials: 'メールアドレスまたはパスワードが違います。',
  email_not_confirmed:
    'メールアドレスが未確認です。確認メールのリンクを開いてください。',
  user_already_exists: 'このメールアドレスは既に登録されています。',
  email_exists: 'このメールアドレスは既に登録されています。',
  weak_password: 'パスワードが簡単すぎます。より複雑なものにしてください。',
  over_email_send_rate_limit:
    'メールの送信回数が上限に達しました。しばらく待ってからお試しください。',
  validation_failed: '入力内容を確認してください。',
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.code && messages[error.code]) return messages[error.code]

    // code が付かない古い形式のフォールバック
    if (error.message.includes('Invalid login credentials')) {
      return messages.invalid_credentials
    }
    if (error.message.includes('Email not confirmed')) {
      return messages.email_not_confirmed
    }
    if (error.message.includes('already registered')) {
      return messages.user_already_exists
    }
    if (error.message.includes('Password should be at least')) {
      return 'パスワードは6文字以上で入力してください。'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return '予期しないエラーが発生しました。'
}

// Telegram Desktop "Export chat history" (JSON): one chat (result.json) or a full account export.
export interface TgMessage {
  key: string // chatId:messageId — used so nothing is imported twice
  chatId: string
  chat: string
  id: number
  date: string // ISO date-time
  from: string
  text: string
  reply: boolean
}
export interface TgChat {
  id: string
  name: string
  messages: TgMessage[]
}

type Raw = { id?: number | string; name?: string; messages?: RawMsg[] }
type RawMsg = { id: number; type?: string; date?: string; from?: string; actor?: string; text?: unknown; reply_to_message_id?: number; photo?: string; file?: string }

/** Telegram stores text as a string or a list of strings and {type, text} pieces. */
export function plainText(t: unknown): string {
  if (typeof t === 'string') return t
  if (Array.isArray(t)) return t.map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && 'text' in x ? String((x as { text: unknown }).text) : '')).join('')
  return ''
}

export function parseExport(json: unknown): TgChat[] {
  const j = json as { chats?: { list?: Raw[] }; messages?: RawMsg[] } & Raw
  const raw: Raw[] = Array.isArray(j?.chats?.list) ? j.chats!.list! : Array.isArray(j?.messages) ? [j] : []
  return raw.map((c) => {
    const id = String(c.id ?? c.name ?? 'chat')
    const name = String(c.name || id)
    const messages = (c.messages || [])
      .filter((m) => m && (m.type === undefined || m.type === 'message'))
      .map((m) => ({
        key: `${id}:${m.id}`,
        chatId: id,
        chat: name,
        id: m.id,
        date: String(m.date || ''),
        from: String(m.from || m.actor || ''),
        text: plainText(m.text).trim() || (m.photo ? '[عکس]' : m.file ? '[فایل]' : ''),
        reply: !!m.reply_to_message_id,
      }))
      .filter((m) => m.text)
    return { id, name, messages }
  }).filter((c) => c.messages.length)
}

/** First line, trimmed to a title. */
export const titleOf = (text: string, max = 110) => {
  const line = text.split('\n').map((x) => x.trim()).find(Boolean) || text
  return line.length > max ? line.slice(0, max - 1).trimEnd() + '…' : line
}

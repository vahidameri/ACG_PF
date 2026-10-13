// Who may see what. The Apps Script backend applies the same rule server-side, so private
// rows never leave the Sheet for people who shouldn't see them; this mirrors it in the client
// (and in the demo, where "view as" switches the viewer).
import type { DB, Task } from './types'

export function isPrivateTask(t: Task, db: DB) {
  if (String(t.private) === '1') return true
  const owner = db.Team.find((m) => m.name === t.assignee)
  return String(owner?.tasks_private || '') === '1'
}

export function canSeeTask(t: Task, db: DB, viewer: string) {
  return !isPrivateTask(t, db) || (!!viewer && (t.assignee === viewer || t.reporter === viewer))
}

export function visibleDB(db: DB, viewer: string): DB {
  const hidden = new Set(db.Tasks.filter((t) => !canSeeTask(t, db, viewer)).map((t) => t.id))
  if (!hidden.size) return db
  return {
    ...db,
    Tasks: db.Tasks.filter((t) => !hidden.has(t.id)),
    Comments: db.Comments.filter((c) => !(c.entity === 'Tasks' && hidden.has(c.entity_id))),
    Files: db.Files.filter((f) => !(f.entity === 'Tasks' && hidden.has(f.entity_id))),
  }
}

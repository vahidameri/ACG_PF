// Starting data: only the real ACG team and project names. Everything else (tasks, meetings,
// deliverables, contracts…) is entered in the app and stored in the Google Sheet.
import type { DB, Member, Project } from '../lib/types'
import { locale } from '../lib/i18n'

const x = (fa: string, en: string) => (locale.lang === 'en' ? en : fa)

export const demoMe = () => x('وحید عامری', 'Vahid Ameri')

const PEOPLE: [string, string, string, string, string, Member['track'], Member['access'], string?][] = [
  ['m1', 'وحید عامری', 'Vahid Ameri', 'مدیر برنامه', 'Program Manager', '', 'super'],
  ['m2', 'جلیل علیزاده', 'Jalil Alizadeh', 'مدیرعامل', 'CEO', '', 'exec', '1'],
  ['m3', 'وحید کیوانیان', 'Vahid Keyvanian', 'هد تک', 'Head of Tech', 'tech', 'head'],
  ['m4', 'مهرزاد گلی', 'Mehrzad Goli', 'هد پروداکت', 'Head of Product', 'product', 'head'],
  ['m5', 'آتنا دهقان', 'Athena Dehghan', 'پروداکت منیجر', 'Product Manager', 'product', 'member'],
  ['m6', 'علی سرمیلی', 'Ali Sormeili', 'پروداکت منیجر', 'Product Manager', 'product', 'member'],
  ['m7', 'علی سالمه', 'Ali Salemeh', 'پروداکت منیجر', 'Product Manager', 'product', 'member'],
  ['m8', 'مهرسا دبیر', 'Mehrsa Dabir', 'پروداکت منیجر', 'Product Manager', 'product', 'member'],
  ['m9', 'بابک معروفی', 'Babak Maroufi', 'پروداکت منیجر', 'Product Manager', 'product', 'member'],
  ['m10', 'امین ظفری', 'Amin Zafari', 'پروداکت منیجر', 'Product Manager', 'product', 'member'],
  ['m11', 'هانیه منصورکیایی', 'Hanie Mansurkiae', 'پروداکت دیزاینر', 'Product Designer', 'product', 'member'],
]

const PROJECTS: [string, string, string][] = [
  ['p1', 'CXO', 'CX Orbit'],
  ['p2', 'IXP', 'Insight X Padida'],
  ['p3', 'RBR', 'Roo B Roo'],
  ['p4', 'KDN', 'Kadiner'],
  ['p5', 'HMF', 'HamAfza'],
  ['p6', 'MYC', 'Myca'],
  ['p7', 'MLK', 'malek'],
  ['p8', 'SMP', 'SimiPass'],
  ['p9', 'INO', 'Ino School'],
  ['p10', 'AISN', 'AISN'],
  ['p11', 'CLP', 'Clarity Pass'],
]

export function buildDemo(): DB {
  const Team: Member[] = PEOPLE.map(([id, fa, en, roleFa, roleEn, track, access, priv]) => ({
    id, name: x(fa, en), name_en: '', role: x(roleFa, roleEn), email: '', team: track === 'tech' ? x('تک', 'Tech') : track === 'product' ? x('پروداکت', 'Product') : x('مدیریت', 'Leadership'),
    track, capacity: 100, photo: '', tasks_private: priv || '', phone: '', access, active: 'true',
  }))
  const Projects: Project[] = PROJECTS.map(([id, code, name]) => ({
    id, code, name, description: '', category: '', owner: '', client: '', liaison: '', liaison_contact: '', status: 'active', priority: 'medium', phase: '',
    start_date: '', end_date: '', progress: 0, health_override: '', objective: '', paused_at: '', pause_reason: '',
  }))
  return {
    Projects, Team, Scope: [], Milestones: [], Sprints: [], Tasks: [], FollowUps: [], Risks: [], Allocations: [], Updates: [], Comments: [],
    Deliverables: [], Meetings: [], Files: [], Config: [], Contracts: [],
  }
}

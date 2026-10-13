import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { can } from './lib/access'
import Admin from './pages/Admin'
import { StoreProvider, useStore } from './lib/store'
import { GoogleProvider } from './lib/google'
import { AutomationProvider } from './lib/automations'
import { I18nProvider } from './lib/i18n'
import { EditorProvider } from './components/Editor'
import { Layout } from './components/Layout'
import Dashboard from './pages/Dashboard'
import MyDesk from './pages/MyDesk'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Roadmap from './pages/Roadmap'
import Sprints from './pages/Sprints'
import Tasks from './pages/Tasks'
import FollowUps from './pages/FollowUps'
import Risks from './pages/Risks'
import Team from './pages/Team'
import Updates from './pages/Updates'
import Report from './pages/Report'
import CalendarPage from './pages/Calendar'
import Teams from './pages/Teams'
import Pulse from './pages/Pulse'
import Plan from './pages/Plan'
import Weekly from './pages/Weekly'
import Profile from './pages/Profile'
import { ComposerProvider } from './components/UpdateComposer'
import { Skeleton } from './components/ui'
import { SignIn } from './components/SignIn'

/** Portfolio-wide pages are for leadership; members land on their own desk. */
function Only({ rule, children }: { rule: 'portfolio' | 'backoffice'; children: React.ReactNode }) {
  const { access } = useStore()
  return can[rule](access) ? <>{children}</> : <Navigate to="/my" replace />
}
function Home() {
  const { access } = useStore()
  return <Navigate to={can.portfolio(access) ? '/' : '/my'} replace />
}

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, lastSync, mode, authed } = useStore()
  if (mode === 'live' && !authed) return <SignIn />
  if (mode === 'live' && loading && !lastSync)
    return (
      <div className="mx-auto max-w-[90rem] space-y-4 pt-8">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <div className="grid gap-4 pt-6 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  return <>{children}</>
}

export default function App() {
  return (
    <GoogleProvider>
    <StoreProvider>
      <I18nProvider>
      <HashRouter>
        <AutomationProvider>
        <EditorProvider>
        <ComposerProvider>
          <Layout>
            <Gate>
              <Routes>
                <Route path="/" element={<Only rule="portfolio"><Dashboard /></Only>} />
                <Route path="/my" element={<MyDesk />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/roadmap" element={<Only rule="portfolio"><Roadmap /></Only>} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/teams" element={<Only rule="portfolio"><Teams /></Only>} />
                <Route path="/pulse" element={<Only rule="portfolio"><Pulse /></Only>} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/weekly" element={<Weekly />} />
                <Route path="/meetings" element={<Weekly />} />
                <Route path="/people/:id" element={<Profile />} />
                <Route path="/me" element={<Profile />} />
                <Route path="/sprints" element={<Sprints />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/followups" element={<FollowUps />} />
                <Route path="/risks" element={<Only rule="portfolio"><Risks /></Only>} />
                <Route path="/team" element={<Only rule="portfolio"><Team /></Only>} />
                <Route path="/updates" element={<Updates />} />
                <Route path="/report" element={<Only rule="portfolio"><Report /></Only>} />
                <Route path="/admin" element={<Only rule="backoffice"><Admin /></Only>} />
                <Route path="/settings" element={<Only rule="backoffice"><Admin initial="settings" /></Only>} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Gate>
          </Layout>
        </ComposerProvider>
        </EditorProvider>
        </AutomationProvider>
      </HashRouter>
      </I18nProvider>
    </StoreProvider>
    </GoogleProvider>
  )
}

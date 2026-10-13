import { HashRouter, Route, Routes } from 'react-router-dom'
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
import Settings from './pages/Settings'
import CalendarPage from './pages/Calendar'
import Teams from './pages/Teams'
import Pulse from './pages/Pulse'
import Plan from './pages/Plan'
import Weekly from './pages/Weekly'
import Profile from './pages/Profile'
import { ComposerProvider } from './components/UpdateComposer'
import { Skeleton } from './components/ui'
import { SignIn } from './components/SignIn'

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
                <Route path="/" element={<Dashboard />} />
                <Route path="/my" element={<MyDesk />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/roadmap" element={<Roadmap />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/pulse" element={<Pulse />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/weekly" element={<Weekly />} />
                <Route path="/meetings" element={<Weekly />} />
                <Route path="/people/:id" element={<Profile />} />
                <Route path="/me" element={<Profile />} />
                <Route path="/sprints" element={<Sprints />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/followups" element={<FollowUps />} />
                <Route path="/risks" element={<Risks />} />
                <Route path="/team" element={<Team />} />
                <Route path="/updates" element={<Updates />} />
                <Route path="/report" element={<Report />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Dashboard />} />
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

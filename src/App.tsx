import { HashRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './lib/store'
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
import { Loader2 } from 'lucide-react'

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, lastSync, mode } = useStore()
  if (mode === 'live' && loading && !lastSync)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-sub">
        <Loader2 className="animate-spin" />
        در حال دریافت داده‌ها از Google Sheets…
      </div>
    )
  return <>{children}</>
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <EditorProvider>
          <Layout>
            <Gate>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/my" element={<MyDesk />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/roadmap" element={<Roadmap />} />
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
        </EditorProvider>
      </HashRouter>
    </StoreProvider>
  )
}

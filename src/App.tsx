import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppInitializer } from '@/components/AppInitializer'
import { AppLayout } from '@/layouts/AppLayout'
import { TodayPage } from '@/pages/TodayPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { TodoPage } from '@/pages/TodoPage'
import { WellnessPage } from '@/pages/WellnessPage'
import { MorePage } from '@/pages/MorePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AboutPage } from '@/pages/AboutPage'

export default function App() {
  return (
    <AppInitializer>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/wellness" element={<WellnessPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/more/settings" element={<SettingsPage />} />
            <Route path="/more/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppInitializer>
  )
}

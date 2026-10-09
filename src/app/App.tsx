import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { ErrorBoundary } from './ErrorBoundary'
import { NotFoundPage } from './NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { EntryDetailPage } from '@/features/library/EntryDetailPage'
import { SearchPage } from '@/features/search/SearchPage'
import { ExplorePage } from '@/features/explore/ExplorePage'
import { GameInfoPage } from '@/features/game-info/GameInfoPage'
import { GameDetailPage } from '@/features/game/GameDetailPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { SteamImportPage } from '@/features/settings/SteamImportPage'

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="library/:entryId" element={<EntryDetailPage />} />
                <Route path="explore" element={<ExplorePage />} />
                <Route path="explore/:gameId" element={<GameInfoPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="game/:gameId" element={<GameDetailPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/steam" element={<SteamImportPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

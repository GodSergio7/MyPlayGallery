import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { ErrorBoundary } from './ErrorBoundary'
import { lazyNamed } from '@/shared/lib/lazyNamed'

// Cada página se descarga al entrar en ella (T-06); AppShell muestra "Cargando…" mientras tanto.
const NotFoundPage = lazyNamed(() => import('./NotFoundPage'), 'NotFoundPage')
const DashboardPage = lazyNamed(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
const LibraryPage = lazyNamed(() => import('@/features/library/LibraryPage'), 'LibraryPage')
const EntryDetailPage = lazyNamed(() => import('@/features/library/EntryDetailPage'), 'EntryDetailPage')
const SearchPage = lazyNamed(() => import('@/features/search/SearchPage'), 'SearchPage')
const ExplorePage = lazyNamed(() => import('@/features/explore/ExplorePage'), 'ExplorePage')
const GameInfoPage = lazyNamed(() => import('@/features/game-info/GameInfoPage'), 'GameInfoPage')
const GameDetailPage = lazyNamed(() => import('@/features/game/GameDetailPage'), 'GameDetailPage')
const SettingsPage = lazyNamed(() => import('@/features/settings/SettingsPage'), 'SettingsPage')
const SteamImportPage = lazyNamed(() => import('@/features/settings/SteamImportPage'), 'SteamImportPage')
const ProfilePage = lazyNamed(() => import('@/features/profile/ProfilePage'), 'ProfilePage')

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

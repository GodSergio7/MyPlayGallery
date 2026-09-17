import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { ErrorBoundary } from './ErrorBoundary'
import { NotFoundPage } from './NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { EntryDetailPage } from '@/features/library/EntryDetailPage'
import { SearchPage } from '@/features/search/SearchPage'
import { GameDetailPage } from '@/features/game/GameDetailPage'

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/:entryId" element={<EntryDetailPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="game/:rawgId" element={<GameDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

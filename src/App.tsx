import { Route, Routes } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { HomePage } from './pages/HomePage';
import { PlayersPage } from './pages/PlayersPage';
import { SettingsPage } from './pages/SettingsPage';
import { TablePage } from './pages/TablePage';

function App() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}

export default App;

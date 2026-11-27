import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { TablePage } from './pages/TablePage';
import { GuidesPage } from './pages/GuidesPage';
import { ChipsPage } from './pages/ChipsPage';
import { EvaluatorPage } from './pages/EvaluatorPage';
import { StudyPage } from './pages/StudyPage';

function DeepDiveRedirect() {
  return <Navigate to={`/guides/${useParams().slug}`} replace />;
}

function App() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-[var(--bg-main)] text-[var(--text-primary)]">
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuidesPage />} />
        {/* Deep dives used to have their own page. */}
        <Route path="/deep-dives" element={<Navigate to="/guides/art-of-bluffing" replace />} />
        <Route path="/deep-dives/:slug" element={<DeepDiveRedirect />} />
        <Route path="/evaluator" element={<EvaluatorPage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route path="/study/:tool" element={<StudyPage />} />
        <Route path="/chips" element={<ChipsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}

export default App;

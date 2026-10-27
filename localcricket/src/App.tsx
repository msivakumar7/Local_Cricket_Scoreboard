import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MatchProvider } from './hooks/useMatch';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import NewMatch from './pages/NewMatch/index';
import LiveScoring from './pages/LiveScoring';
import Scorecard from './pages/Scorecard';
import Analysis from './pages/Analysis';
import History from './pages/History';
import Settings from './pages/Settings';
import Help from './pages/Help';

export default function App() {
  const basename = import.meta.env.BASE_URL;

  return (
    <BrowserRouter basename={basename}>
      <MatchProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup" element={<NewMatch />} />
            <Route path="/scoring" element={<LiveScoring />} />
            <Route path="/scorecard" element={<Scorecard />} />
            <Route path="/scorecard/:id" element={<Scorecard />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/analysis/:id" element={<Analysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </MatchProvider>
    </BrowserRouter>
  );
}

import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  const path = window.location.pathname;

  if (path === '/login') {
    return <LoginPage />;
  }

  return <DashboardPage />;
}

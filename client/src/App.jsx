import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import TripList from './components/TripList';
import Login from './components/Login';
import Register from './components/Register';
import MyBookings from './components/MyBookings';
import TripDetails from './pages/TripDetails';
import DriverTrips from './pages/DriverTrips';
import Profile from './pages/Profile';
import DriverProfile from './pages/DriverProfile';
import AdminPanel from './pages/AdminPanel';
import { ROLE_LABELS } from './utils';
import './App.css';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(); // POST /auth/logout — сервер очищает cookie
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        🚗 <span>Попутчик</span>
      </Link>
      <div className="nav-links">
        <NavLink to="/" end>Поездки</NavLink>
        {(user?.role === 'user' || user?.role === 'driver') && <NavLink to="/my-bookings">Мои брони</NavLink>}
        {user?.role === 'driver' && <NavLink to="/driver">Мои поездки</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Админка</NavLink>}
        {user && <NavLink to="/profile">Профиль</NavLink>}
      </div>
      <div className="auth-block">
        {user ? (
          <>
            <span className="hello">
              {user.name} <span className={`badge badge-${user.role}`}>{ROLE_LABELS[user.role]}</span>
            </span>
            <button onClick={handleLogout} className="btn btn-outline">Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">Войти</Link>
            <Link to="/register" className="btn btn-primary">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// Защищённый маршрут: пускает только авторизованных (и, если указано, с нужной ролью)
function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main className="app">
          <Routes>
            <Route path="/" element={<TripList />} />
            <Route path="/trips/:id" element={<TripDetails />} />
            <Route path="/users/:id" element={<DriverProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/my-bookings" element={<Protected roles={['user', 'driver']}><MyBookings /></Protected>} />
            <Route path="/driver" element={<Protected roles={['driver']}><DriverTrips /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/admin" element={<Protected roles={['admin']}><AdminPanel /></Protected>} />
            <Route path="*" element={<div className="card empty">Страница не найдена. <Link to="/">На главную</Link></div>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

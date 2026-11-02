import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import TripList from './components/TripList';
import Login from './components/Login';
import Register from './components/Register';
import MyBookings from './components/MyBookings';
import './App.css';

function Header() {
  const { user } = useAuth();
  
  const handleLogout = () => {
    // Бэкенд очистит куки, и мы перезагрузим страницу
    window.location.href = 'http://localhost:3000/auth/logout';
  };

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/">🚌 Поездки</Link>
        {user?.role === 'user' && <Link to="/my-bookings">🎫 Мои билеты</Link>}
      </div>
      <div className="auth-block">
        {user ? (
          <>
            <span>Привет, <strong>{user.email}</strong> <span className="badge">{user.role}</span></span>
            <button onClick={handleLogout} className="btn-outline">Выйти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline">Войти</Link>
            <Link to="/register" className="btn-primary">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<TripList />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/my-bookings" element={<MyBookings />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
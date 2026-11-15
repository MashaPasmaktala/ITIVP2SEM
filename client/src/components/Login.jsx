import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { errText } from '../utils';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser(form);
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      setError(errText(err, 'Ошибка входа'));
    }
  };

  return (
    <div className="auth-form card">
      <h2>Вход</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button type="submit" className="btn btn-primary btn-block">Войти</button>
      </form>
      <p className="muted center">Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link></p>
      <p className="muted center small">Тестовые: admin@test.com, ivan@test.com, anna@test.com — пароль 123456</p>
    </div>
  );
}

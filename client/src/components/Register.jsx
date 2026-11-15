import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api';
import { errText } from '../utils';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(form);
      navigate('/login');
    } catch (err) {
      setError(errText(err, 'Ошибка регистрации'));
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="auth-form card">
      <h2>Регистрация</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Имя" value={form.name} onChange={set('name')} />
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Пароль (от 6 символов)" minLength="6" value={form.password} onChange={set('password')} required />
        <button type="submit" className="btn btn-primary btn-block">Создать аккаунт</button>
      </form>
      <p className="muted center">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      <p className="muted center small">Хотите возить пассажиров? После регистрации нажмите «Стать водителем» в профиле.</p>
    </div>
  );
}

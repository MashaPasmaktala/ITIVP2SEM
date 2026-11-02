import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  return (
    <div className="auth-form">
      <h2>Регистрация</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email (@gmail.com)" onChange={e => setForm({...form, email: e.target.value})} required />
        <input type="password" placeholder="Пароль (от 6 символов)" minLength="6" onChange={e => setForm({...form, password: e.target.value})} required />
        <button type="submit">Создать аккаунт</button>
      </form>
    </div>
  );
}
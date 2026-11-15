import { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword, becomeDriver } from '../api';
import { useAuth } from '../context/AuthContext';
import { errText, ROLE_LABELS } from '../utils';

const EMPTY_CAR = { brand: '', model: '', color: '', plate: '', year: '' };

export default function Profile() {
  const { refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ name: '', phone: '', city: '', bio: '' });
  const [car, setCar] = useState(EMPTY_CAR);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });
  const [message, setMessage] = useState(null);

  const fill = (data) => {
    setUser(data);
    setProfile({ name: '', phone: '', city: '', bio: '', ...data.profile });
    setCar({ ...EMPTY_CAR, ...data.car });
  };

  useEffect(() => {
    getProfile()
      .then((res) => fill(res.data))
      .catch((err) => setMessage({ type: 'error', text: errText(err) }));
  }, []);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.scrollTo(0, 0);
  };

  const cleanCar = () => ({ ...car, year: car.year ? Number(car.year) : undefined });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile({ profile, car: user.role === 'driver' ? cleanCar() : undefined });
      fill(res.data);
      await refreshUser(); // обновить имя в шапке
      notify('success', 'Профиль сохранён');
    } catch (err) {
      notify('error', errText(err));
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    try {
      await changePassword(passwords);
      setPasswords({ oldPassword: '', newPassword: '' });
      notify('success', 'Пароль изменён');
    } catch (err) {
      notify('error', errText(err));
    }
  };

  const handleBecomeDriver = async (e) => {
    e.preventDefault();
    try {
      const res = await becomeDriver({ car: cleanCar(), phone: profile.phone });
      fill(res.data.user);
      await refreshUser(); // роль в шапке сменится на «Водитель»
      notify('success', res.data.message);
    } catch (err) {
      notify('error', errText(err));
    }
  };

  if (!user) return <div className="loading">{message?.text || 'Загрузка...'}</div>;

  const setP = (key) => (e) => setProfile({ ...profile, [key]: e.target.value });
  const setC = (key) => (e) => setCar({ ...car, [key]: e.target.value });

  const carFields = (
    <div className="form-grid">
      <label>Марка<input value={car.brand} onChange={setC('brand')} placeholder="Volkswagen" required /></label>
      <label>Модель<input value={car.model} onChange={setC('model')} placeholder="Passat" required /></label>
      <label>Цвет<input value={car.color} onChange={setC('color')} placeholder="Серый" /></label>
      <label>Госномер<input value={car.plate} onChange={setC('plate')} placeholder="1234 AB-7" /></label>
      <label>Год выпуска<input type="number" value={car.year} onChange={setC('year')} min="1980" max="2100" /></label>
    </div>
  );

  return (
    <div className="profile">
      <h1>👤 Профиль</h1>
      {message && <div className={message.type === 'error' ? 'error-banner' : 'success-banner'}>{message.text}</div>}

      <div className="card">
        <div className="profile-head">
          <div className="avatar">{(profile.name || user.email)[0].toUpperCase()}</div>
          <div>
            <strong>{user.email}</strong>
            <div><span className={`badge badge-${user.role}`}>{ROLE_LABELS[user.role]}</span></div>
            <div className="muted small">С нами с {new Date(user.createdAt).toLocaleDateString('ru-RU')}</div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <h3>Личные данные</h3>
          <div className="form-grid">
            <label>Имя<input value={profile.name} onChange={setP('name')} /></label>
            <label>Телефон<input value={profile.phone} onChange={setP('phone')} placeholder="+375291234567" /></label>
            <label>Город<input value={profile.city} onChange={setP('city')} /></label>
            <label className="span-2">О себе<textarea rows="2" value={profile.bio} onChange={setP('bio')} /></label>
          </div>
          {user.role === 'driver' && (
            <>
              <h3>Автомобиль</h3>
              {carFields}
            </>
          )}
          <button type="submit" className="btn btn-primary">Сохранить</button>
        </form>
      </div>

      {user.role === 'user' && (
        <form className="card" onSubmit={handleBecomeDriver}>
          <h3>🚗 Стать водителем</h3>
          <p className="muted">Укажите автомобиль — и сможете публиковать свои поездки и брать попутчиков.</p>
          {carFields}
          <button type="submit" className="btn btn-primary">Стать водителем</button>
        </form>
      )}

      <form className="card" onSubmit={handlePassword}>
        <h3>🔒 Смена пароля</h3>
        <div className="form-grid">
          <label>Старый пароль<input type="password" value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} required /></label>
          <label>Новый пароль<input type="password" minLength="6" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required /></label>
        </div>
        <button type="submit" className="btn btn-ghost">Сменить пароль</button>
      </form>
    </div>
  );
}

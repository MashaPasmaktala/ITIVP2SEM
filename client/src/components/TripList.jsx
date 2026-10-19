import { useState, useEffect } from 'react';

const STORAGE_KEY = 'trips_data';

// Добавили водителя и рейтинг
const initialTrips = [
  { id: 1, from: 'Минск', to: 'Могилев', price: 150, date: '2026-11-01', driver: 'Иван', rating: 4.8 },
  { id: 2, from: 'Казань', to: 'Москва', price: 200, date: '2026-11-02', driver: 'Мария', rating: 4.5 },
];

export default function TripList() {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Имитация загрузки

  const [form, setForm] = useState({
    from: '', to: '', price: '', date: '', driver: '', rating: '5'
  });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');

  // 1. ЗАГРУЗКА ПРИ СТАРТЕ (имитация задержки 1 сек)
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setTrips(JSON.parse(saved));
        } catch (e) {
          setTrips(initialTrips);
        }
      } else {
        setTrips(initialTrips);
      }
      setIsLoading(false); // Выключаем загрузку
    }, 1000); // Задержка 1 секунда

    return () => clearTimeout(timer);
  }, []);

  // 2. СОХРАНЕНИЕ С DEBOUNCE (500 мс)
  useEffect(() => {
    if (isLoading) return; // Не сохраняем пустой массив во время загрузки
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    }, 500);
    return () => clearTimeout(timer);
  }, [trips, isLoading]);

  // 3. ИЗМЕНЕНИЕ ЗАГОЛОВКА СТРАНИЦЫ
  useEffect(() => {
    document.title = `Поездки (${trips.length})`;
  }, [trips]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // --- ВАЛИДАЦИЯ ---
    // 1. Только буквы в полях Откуда и Куда
    const textRegex = /^[А-Яа-яЁёA-Za-z\s\-]+$/;
    if (!textRegex.test(form.from.trim())) {
      alert('Поле "Откуда" должно содержать только буквы (без цифр и символов)');
      return;
    }
    if (!textRegex.test(form.to.trim())) {
      alert('Поле "Куда" должно содержать только буквы (без цифр и символов)');
      return;
    }

    // 2. Дата не в прошлом
    const selectedDate = new Date(form.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      alert('Дата отправления не может быть в прошлом');
      return;
    }

    // 3. Рейтинг от 0 до 5
    const ratingNum = Number(form.rating);
    if (ratingNum < 0 || ratingNum > 5) {
      alert('Рейтинг должен быть от 0 до 5');
      return;
    }

    // --- СОЗДАНИЕ/ОБНОВЛЕНИЕ ---
    const newTrip = {
      from: form.from.trim(),
      to: form.to.trim(),
      price: Number(form.price),
      date: form.date,
      driver: form.driver.trim() || 'Не назначен',
      rating: ratingNum,
    };

    if (editingId !== null) {
      setTrips(trips.map((t) => (t.id === editingId ? { ...t, ...newTrip } : t)));
      setEditingId(null);
    } else {
      setTrips([...trips, { ...newTrip, id: Date.now() }]);
    }

    setForm({ from: '', to: '', price: '', date: '', driver: '', rating: '5' });
  };

  const handleDelete = (id) => {
    setTrips(trips.filter((t) => t.id !== id));
  };

  const handleEdit = (trip) => {
    setForm({
      from: trip.from,
      to: trip.to,
      price: String(trip.price),
      date: trip.date,
      driver: trip.driver || '',
      rating: String(trip.rating || 5),
    });
    setEditingId(trip.id);
    window.scrollTo(0, 0); // Скролл вверх к форме
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ from: '', to: '', price: '', date: '', driver: '', rating: '5' });
  };

  // Фильтрация
  const filteredTrips = filter
    ? trips.filter((t) => t.to.toLowerCase().includes(filter.toLowerCase()))
    : trips;

  // Статистика
  const totalPrice = filteredTrips.reduce((sum, t) => sum + t.price, 0);

  // ЭКРАН ЗАГРУЗКИ
  if (isLoading) {
    return <div className="loading">⏳ Имитация загрузки с сервера...</div>;
  }

  return (
    <div className="trip-list">
      {/* Форма */}
      <form className="trip-form" onSubmit={handleSubmit}>
        <h2>{editingId !== null ? '✏️ Редактировать поездку' : '➕ Добавить поездку'}</h2>

        <div className="form-grid">
          <input type="text" name="from" placeholder="Откуда" value={form.from} onChange={handleChange} required />
          <input type="text" name="to" placeholder="Куда" value={form.to} onChange={handleChange} required />
          <input type="number" name="price" placeholder="Цена (BYN)" value={form.price} onChange={handleChange} min="0" required />
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
          <input type="text" name="driver" placeholder="Водитель (Имя)" value={form.driver} onChange={handleChange} />
          <input type="number" name="rating" placeholder="Рейтинг (0-5)" value={form.rating} onChange={handleChange} min="0" max="5" step="0.1" />
        </div>

        <div className="form-actions">
          <button type="submit">{editingId !== null ? 'Сохранить' : 'Добавить'}</button>
          {editingId !== null && (
            <button type="button" className="btn-cancel" onClick={handleCancelEdit}>Отмена</button>
          )}
        </div>
      </form>

      {/* Фильтр и Статистика */}
      <div className="filter">
        <input type="text" placeholder="🔍 Фильтр по пункту назначения..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="stats">
        Всего поездок: <strong>{filteredTrips.length}</strong> | Общая стоимость: <strong>{totalPrice} BYN</strong>
      </div>

      {/* Список */}
      <ul className="trips">
        {filteredTrips.length === 0 ? (
          <li className="empty">Поездок не найдено</li>
        ) : (
          filteredTrips.map((trip) => (
            <li key={trip.id} className="trip-item">
              <div className="trip-info">
                <span className="route">
                  <strong>{trip.from}</strong> → <strong>{trip.to}</strong> 
                  <span className="rating">⭐ {trip.rating}</span>
                </span>
                <span className="meta">
                  {trip.date} | {trip.price} BYN | Водитель: {trip.driver}
                </span>
              </div>
              <div className="trip-actions">
                <button className="btn-edit" onClick={() => handleEdit(trip)}>✏️</button>
                <button className="btn-delete" onClick={() => handleDelete(trip.id)}>🗑️</button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
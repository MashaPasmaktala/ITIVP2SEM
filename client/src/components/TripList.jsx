import { useState, useEffect } from 'react';
import { fetchTrips, createTrip, deleteTrip, updateTrip, buyTicket } from '../api';
import { useAuth } from '../context/AuthContext';

export default function TripList() {
  const { user } = useAuth(); 
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [form, setForm] = useState({ from: '', to: '', departureAt: '', price: '', seats: '', rating: '5' });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('');

  const loadTrips = async (signal) => {
    setIsLoading(true);
    try {
      const res = await fetchTrips({ signal });
      const formatted = res.data.map(t => ({
        ...t,
        departureAt: new Date(t.departureAt).toISOString().slice(0, 16)
      }));
      setTrips(formatted);
      setError(null);
    } catch (err) {
      if (err.name !== 'CanceledError') setError('Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Отмена запроса при размонтировании (AbortController)
  useEffect(() => {
    const controller = new AbortController();
    loadTrips(controller.signal);
    return () => controller.abort();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 2. ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ (Оптимистично)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const tripData = {
      from: form.from, to: form.to,
      departureAt: new Date(form.departureAt).toISOString(),
      price: Number(form.price), seats: Number(form.seats), rating: Number(form.rating)
    };

    if (editingId) {
      const old = [...trips];
      setTrips(trips.map(t => t.id === editingId ? { ...t, ...tripData } : t)); // Оптимистично
      setEditingId(null); setForm({ from: '', to: '', departureAt: '', price: '', seats: '', rating: '5' });
      try { await updateTrip(editingId, tripData); } 
      catch (err) { setTrips(old); setError('Ошибка редактирования'); }
    } else {
      const tempId = Date.now();
      const newTrip = { ...tripData, id: tempId };
      const old = [...trips];
      setTrips([...trips, newTrip]); // Оптимистично
      setForm({ from: '', to: '', departureAt: '', price: '', seats: '', rating: '5' });
      try {
        const res = await createTrip(tripData);
        setTrips(prev => prev.map(t => t.id === tempId ? res.data : t)); // Замена ID
      } catch (err) { setTrips(old); setError('Ошибка добавления'); }
    }
  };

  // 3. УДАЛЕНИЕ (Оптимистично)
  const handleDelete = async (id) => {
    const old = [...trips];
    setTrips(trips.filter(t => t.id !== id)); 
    try { await deleteTrip(id); } 
    catch (err) { setTrips(old); setError('Ошибка удаления'); }
  };

  // 4. ПОКУПКА БИЛЕТА
  const handleBuy = async (id) => {
    try {
      await buyTicket(id);
      alert('Билет куплен!');
      loadTrips(); // Перезагружаем, чтобы обновить места
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const filteredTrips = filter ? trips.filter(t => t.to.toLowerCase().includes(filter.toLowerCase())) : trips;

  if (isLoading) return <div className="loading">⏳ Загрузка...</div>;
  if (error && trips.length === 0) return (
    <div className="error-screen"><p>❌ {error}</p><button onClick={() => loadTrips()}>Повторить</button></div>
  );

  return (
    <div className="trip-list">
      {error && <div className="error-banner">{error} <button onClick={() => setError(null)}>X</button></div>}

      {/* ФОРМА (ТОЛЬКО ДЛЯ АДМИНА) */}
      {user?.role === 'admin' && (
        <form className="trip-form" onSubmit={handleSubmit}>
          <h2>{editingId ? '✏️ Редактировать' : '➕ Добавить поездку'}</h2>
          <div className="form-grid">
            <input type="text" name="from" placeholder="Откуда" value={form.from} onChange={handleChange} required />
            <input type="text" name="to" placeholder="Куда" value={form.to} onChange={handleChange} required />
            <input type="datetime-local" name="departureAt" value={form.departureAt} onChange={handleChange} required />
            <input type="number" name="price" placeholder="Цена" value={form.price} onChange={handleChange} min="0" required />
            <input type="number" name="seats" placeholder="Мест" value={form.seats} onChange={handleChange} min="0" required />
            <input type="number" name="rating" placeholder="Рейтинг" value={form.rating} onChange={handleChange} min="0" max="5" step="0.1" />
          </div>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Сохранить' : 'Добавить'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ from: '', to: '', departureAt: '', price: '', seats: '', rating: '5' }); }}>Отмена</button>}
          </div>
        </form>
      )}

      <div className="filter">
        <input type="text" placeholder="🔍 Фильтр по пункту назначения..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

           <ul className="trips">
        {filteredTrips.map(trip => (
          <li key={trip.id} className="trip-item">
            <div className="trip-info">
              <span className="route"><strong>{trip.from}</strong> → <strong>{trip.to}</strong> <span className="rating">⭐ {trip.rating}</span></span>
              <span className="meta">{trip.departureAt.replace('T', ' ')} | {trip.price} BYN | Мест: {trip.seats}</span>
              
              {/* БЛОК ДЛЯ ПРОСМОТРА БРОНЕЙ (только для админа/менеджера) */}
              {(user?.role === 'admin' || user?.role === 'manager') && trip.bookings && trip.bookings.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', background: '#f0f7ff', padding: '5px', borderRadius: '4px' }}>
                  <strong>Забронировали:</strong> {trip.bookings.map(b => b.user?.email).join(', ')}
                </div>
              )}
            </div>
            
            <div className="trip-actions">
              {/* Кнопки для АДМИНА / МЕНЕДЖЕРА */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <>
                  <button onClick={() => { setForm({...trip, departureAt: trip.departureAt}); setEditingId(trip.id); window.scrollTo(0,0); }}>✏️</button>
                  <button onClick={() => handleDelete(trip.id)}>🗑️</button>
                </>
              )}
              
              {/* Кнопка для ЮЗЕРА (сделаем её контрастной) */}
              {user?.role === 'user' && (
                <button 
                  className={`btn-buy ${trip.seats > 0 ? 'btn-buy-active' : ''}`} 
                  onClick={() => handleBuy(trip.id)} 
                  disabled={trip.seats <= 0}
                >
                  {trip.seats > 0 ? 'Купить билет' : 'Нет мест'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
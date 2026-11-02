import { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../api';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = () => {
    setLoading(true);
    getMyBookings()
      .then(res => setBookings(res.data))
      .catch(() => alert('Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Вы уверены, что хотите сдать билет?')) return;
    
    // Оптимистично убираем из списка
    const oldBookings = [...bookings];
    setBookings(bookings.filter(b => b.id !== id));
    
    try {
      await cancelBooking(id);
    } catch (err) {
      setBookings(oldBookings); // Откат при ошибке
      alert(err.response?.data?.error || 'Ошибка отмены');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="my-bookings">
      <h2>🎫 Мои билеты</h2>
      {bookings.length === 0 ? <p>У вас пока нет билетов.</p> : (
        <ul>
          {bookings.map(b => (
            <li key={b.id} className="trip-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{b.trip.from} → {b.trip.to}</strong>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Цена: {b.trip.price} BYN | Дата: {new Date(b.trip.departureAt).toLocaleDateString()}
                </div>
              </div>
              <button 
                onClick={() => handleCancel(b.id)}
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                Сдать билет
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
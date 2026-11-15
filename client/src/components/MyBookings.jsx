import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBookings, cancelBooking, changeBookingSeats } from '../api';
import { errText, formatDate, driverName, seatsText, STATUS_LABELS } from '../utils';

// Бронь «актуальна», если она активна и поездка ещё впереди
const isUpcoming = (b) => b.status === 'active' && b.trip?.status === 'scheduled' && new Date(b.trip.departureAt) > new Date();

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    getMyBookings()
      .then((res) => setBookings(res.data))
      .catch((err) => alert(errText(err, 'Ошибка загрузки')))
      .finally(() => setLoading(false));
  }, []);

  // Отмена брони (оптимистично: сразу меняем статус, при ошибке откатываем)
  const handleCancel = async (id) => {
    if (!window.confirm('Отменить бронь? Места вернутся водителю.')) return;
    const old = bookings;
    setBookings(bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)));
    try {
      await cancelBooking(id);
    } catch (err) {
      setBookings(old);
      alert(errText(err, 'Ошибка отмены'));
    }
  };

  // Изменение количества мест в брони
  const handleSeats = async (id, seats) => {
    try {
      await changeBookingSeats(id, seats);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, seats } : b)));
    } catch (err) {
      alert(errText(err, 'Не удалось изменить количество мест'));
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  const upcoming = bookings.filter(isUpcoming);
  const history = bookings.filter((b) => !isUpcoming(b));
  const list = tab === 'upcoming' ? upcoming : history;

  return (
    <div className="my-bookings">
      <h1>🎫 Мои брони</h1>
      <div className="tabs">
        <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Предстоящие ({upcoming.length})</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>История ({history.length})</button>
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          {tab === 'upcoming' ? <>Нет предстоящих поездок. <Link to="/">Найти поездку</Link></> : 'История пуста.'}
        </div>
      ) : (
        <ul className="trips">
          {list.map((b) =>
            !b.trip ? (
              <li key={b.id} className="trip-card trip-card-muted"><div className="trip-card-main">Поездка удалена</div></li>
            ) : (
              <li key={b.id} className={`trip-card ${b.status === 'cancelled' ? 'trip-card-muted' : ''}`}>
                <Link to={`/trips/${b.trip.id}`} className="trip-card-main two-col">
                  <div className="trip-route">
                    <div className="route-line">
                      <strong>{b.trip.from}</strong><span className="arrow">→</span><strong>{b.trip.to}</strong>
                    </div>
                    <div className="muted">{formatDate(b.trip.departureAt)} · водитель {driverName(b.trip.driver)}</div>
                    {b.trip.driver?.profile?.phone && b.status === 'active' && <div className="small">📞 {b.trip.driver.profile.phone}</div>}
                  </div>
                  <div className="trip-price">
                    <strong>{b.trip.price * b.seats} BYN</strong>
                    <span>{seatsText(b.seats)}</span>
                    <span className={`status status-${b.status === 'cancelled' ? 'cancelled' : b.trip.status}`}>
                      {b.status === 'cancelled' ? 'Бронь отменена' : STATUS_LABELS[b.trip.status]}
                    </span>
                  </div>
                </Link>
                <div className="trip-card-actions">
                  {isUpcoming(b) && (
                    <>
                      <label className="small inline-label">
                        Мест:{' '}
                        <select value={b.seats} onChange={(e) => handleSeats(b.id, Number(e.target.value))}>
                          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                      <button className="btn btn-ghost danger" onClick={() => handleCancel(b.id)}>Отменить бронь</button>
                    </>
                  )}
                  {b.status === 'active' && !b.reviewed && b.trip.status === 'completed' && (
                    <Link to={`/trips/${b.trip.id}#reviews`} className="btn btn-primary">⭐ Оставить отзыв</Link>
                  )}
                  {b.reviewed && <span className="muted small">Отзыв оставлен ✓</span>}
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

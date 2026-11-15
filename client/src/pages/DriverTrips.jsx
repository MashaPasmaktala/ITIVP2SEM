import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyDriverTrips, createTrip, setTripStatus } from '../api';
import { errText, seatsText } from '../utils';
import TripForm from '../components/TripForm';
import TripCard from '../components/TripCard';

// Кабинет водителя: мои поездки, пассажиры, публикация новой поездки
export default function DriverTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('scheduled');

  const load = useCallback(
    () =>
      fetchMyDriverTrips()
        .then((res) => setTrips(res.data))
        .catch((err) => alert(errText(err, 'Ошибка загрузки'))),
    []
  );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleCreate = async (data) => {
    try {
      await createTrip(data);
      setShowForm(false);
      await load();
    } catch (err) {
      alert(errText(err, 'Не удалось опубликовать поездку'));
    }
  };

  const handleStatus = async (id, status) => {
    if (status === 'cancelled' && !window.confirm('Отменить поездку? Брони пассажиров будут отменены.')) return;
    try {
      await setTripStatus(id, status);
      await load();
    } catch (err) {
      alert(errText(err));
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  const list = trips.filter((t) => (tab === 'scheduled' ? t.status === 'scheduled' : t.status !== 'scheduled'));
  const earned = trips
    .filter((t) => t.status !== 'cancelled')
    .reduce((sum, t) => sum + t.passengers.reduce((s, p) => s + p.seats, 0) * t.price, 0);

  return (
    <div>
      <div className="list-header">
        <h1>🚘 Мои поездки</h1>
        {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>➕ Опубликовать</button>}
      </div>

      <div className="stat-cards">
        <div className="stat"><span>Всего поездок</span><strong>{trips.length}</strong></div>
        <div className="stat"><span>Предстоящих</span><strong>{trips.filter((t) => t.status === 'scheduled').length}</strong></div>
        <div className="stat"><span>Пассажиров</span><strong>{trips.reduce((s, t) => s + t.passengers.length, 0)}</strong></div>
        <div className="stat"><span>Заработано</span><strong>{earned} BYN</strong></div>
      </div>

      {showForm && <TripForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      <div className="tabs">
        <button className={tab === 'scheduled' ? 'active' : ''} onClick={() => setTab('scheduled')}>Предстоящие</button>
        <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Завершённые и отменённые</button>
      </div>

      {list.length === 0 ? (
        <div className="card empty">Здесь пока пусто.</div>
      ) : (
        <ul className="trips">
          {list.map((trip) => (
            <TripCard key={trip.id} trip={trip}>
              <div className="passengers">
                <strong>Пассажиры:</strong>{' '}
                {trip.passengers.length
                  ? trip.passengers.map((p) => `${p.user?.profile?.name || p.user?.email} (${seatsText(p.seats)})`).join(', ')
                  : 'пока нет'}
              </div>
              <Link to={`/trips/${trip.id}`} className="btn btn-ghost">Подробнее</Link>
              {trip.status === 'scheduled' && (
                <>
                  <button className="btn btn-ghost" onClick={() => handleStatus(trip.id, 'completed')}>✔ Завершить</button>
                  <button className="btn btn-ghost danger" onClick={() => handleStatus(trip.id, 'cancelled')}>✕ Отменить</button>
                </>
              )}
            </TripCard>
          ))}
        </ul>
      )}
    </div>
  );
}

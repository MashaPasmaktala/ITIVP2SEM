import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTrips, createTrip, deleteTrip, updateTrip, getMyBookings } from '../api';
import { useAuth } from '../context/AuthContext';
import { errText, seatsText } from '../utils';
import TripForm from './TripForm';
import TripCard from './TripCard';
import SeatsBooking from './SeatsBooking';

const EMPTY_FILTERS = { from: '', to: '', date: '', maxPrice: '', seats: '', tag: '', sort: 'departureAt' };
const PAGE_SIZE = 8;

export default function TripList() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS); // то, что в полях формы поиска
  const [query, setQuery] = useState({ ...EMPTY_FILTERS, page: 1 }); // применённый поиск
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [myBooked, setMyBooked] = useState({}); // { tripId: кол-во мест } — мои активные брони

  const canPublish = user?.role === 'admin' || user?.role === 'driver';
  const canManage = (trip) => user?.role === 'admin' || (user && trip.driver?.id === user.id);
  const canBook = (trip) => (user?.role === 'user' || user?.role === 'driver') && trip.driver?.id !== user.id;

  // 1. Загрузка с сервера при изменении поиска. AbortController отменяет старый запрос.
  useEffect(() => {
    const controller = new AbortController();
    const params = Object.fromEntries(Object.entries({ ...query, limit: PAGE_SIZE }).filter(([, v]) => v !== ''));
    fetchTrips(params, { signal: controller.signal })
      .then((res) => {
        setTrips(res.data.items);
        setMeta({ total: res.data.total, pages: res.data.pages });
        setError(null);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') setError(errText(err, 'Ошибка загрузки — сервер запущен?'));
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [query, reloadKey]);

  // Мои активные брони — чтобы вместо кнопки «Забронировать» показать «Уже забронировано»
  const isPassenger = user?.role === 'user' || user?.role === 'driver';
  useEffect(() => {
    if (!isPassenger) return;
    getMyBookings()
      .then((res) =>
        setMyBooked(
          Object.fromEntries(res.data.filter((b) => b.status === 'active' && b.trip).map((b) => [b.trip.id, b.seats]))
        )
      )
      .catch(() => {});
  }, [isPassenger, reloadKey]);

  const reload = () => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };

  const applySearch = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setQuery({ ...filters, page: 1 });
  };

  const resetSearch = () => {
    setFilters(EMPTY_FILTERS);
    setIsLoading(true);
    setQuery({ ...EMPTY_FILTERS, page: 1 });
  };

  const goToPage = (page) => {
    setIsLoading(true);
    setQuery({ ...query, page });
    window.scrollTo(0, 0);
  };

  const setFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  // 2. ДОБАВЛЕНИЕ (оптимистично: сразу показываем, потом подменяем ответом сервера)
  const handleCreate = async (tripData) => {
    const tempId = `temp-${Date.now()}`;
    const old = trips;
    setTrips([{ ...tripData, id: tempId, seats: tripData.seatsTotal, status: 'scheduled', tags: [], stops: [] }, ...trips]);
    setShowForm(false);
    try {
      const res = await createTrip(tripData);
      setTrips((prev) => prev.map((t) => (t.id === tempId ? res.data : t)));
    } catch (err) {
      setTrips(old);
      setError(errText(err, 'Ошибка добавления'));
    }
  };

  // 3. РЕДАКТИРОВАНИЕ (оптимистично)
  const handleUpdate = async (tripData) => {
    const id = editingTrip.id;
    const old = trips;
    setTrips(trips.map((t) => (t.id === id ? { ...t, ...tripData, stops: t.stops, tags: t.tags } : t)));
    setEditingTrip(null);
    try {
      const res = await updateTrip(id, tripData);
      setTrips((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    } catch (err) {
      setTrips(old);
      setError(errText(err, 'Ошибка редактирования'));
    }
  };

  // 4. УДАЛЕНИЕ (оптимистично, откат при ошибке)
  const handleDelete = async (id) => {
    if (!window.confirm('Удалить поездку? Все брони на неё тоже будут удалены.')) return;
    const old = trips;
    setTrips(trips.filter((t) => t.id !== id));
    try {
      await deleteTrip(id);
    } catch (err) {
      setTrips(old);
      setError(errText(err, 'Ошибка удаления'));
    }
  };

  // 5. После брони обновляем количество мест в карточке
  const handleBooked = (data) => {
    setTrips((prev) => prev.map((t) => (t.id === data.trip.id ? { ...t, seats: data.trip.seats } : t)));
    setMyBooked((prev) => ({ ...prev, [data.trip.id]: data.booking.seats }));
    alert('Места забронированы! Бронь появилась в разделе «Мои брони».');
  };

  return (
    <div className="trip-list">
      <section className="hero">
        <h1>Куда поедем?</h1>
        <p>Находите попутчиков и экономьте на дороге</p>
        <form className="search" onSubmit={applySearch}>
          <input name="from" placeholder="Откуда" value={filters.from} onChange={setFilter} />
          <input name="to" placeholder="Куда" value={filters.to} onChange={setFilter} />
          <input name="date" type="date" value={filters.date} onChange={setFilter} />
          <button type="submit" className="btn btn-primary">Найти</button>
        </form>
        <div className="search-extra">
          <input name="maxPrice" type="number" min="0" placeholder="Цена до, BYN" value={filters.maxPrice} onChange={setFilter} />
          <select name="seats" value={filters.seats} onChange={setFilter}>
            <option value="">Любое кол-во мест</option>
            <option value="1">от 1 места</option>
            <option value="2">от 2 мест</option>
            <option value="3">от 3 мест</option>
          </select>
          <input name="tag" placeholder="Тег (например, комфорт)" value={filters.tag} onChange={setFilter} />
          <select name="sort" value={filters.sort} onChange={setFilter}>
            <option value="departureAt">Сначала ранние</option>
            <option value="price">Сначала дешёвые</option>
            <option value="-price">Сначала дорогие</option>
            <option value="rating">По рейтингу</option>
            <option value="new">Новые объявления</option>
          </select>
          <button type="button" className="btn btn-ghost" onClick={resetSearch}>Сбросить</button>
        </div>
      </section>

      {error && (
        <div className="error-banner">
          {error} <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {canPublish && !showForm && !editingTrip && (
        <button className="btn btn-primary publish-btn" onClick={() => setShowForm(true)}>➕ Опубликовать поездку</button>
      )}
      {showForm && <TripForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
      {editingTrip && <TripForm key={editingTrip.id} trip={editingTrip} onSubmit={handleUpdate} onCancel={() => setEditingTrip(null)} />}

      <div className="list-header">
        <h2>Найдено поездок: {meta.total}</h2>
        <button className="btn btn-ghost" onClick={reload}>⟳ Обновить</button>
      </div>

      {isLoading ? (
        <div className="loading">⏳ Загрузка...</div>
      ) : trips.length === 0 ? (
        <div className="card empty">Поездок не найдено. Попробуйте изменить параметры поиска.</div>
      ) : (
        <ul className="trips">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip}>
              {canManage(trip) && (
                <>
                  <button className="btn btn-ghost" onClick={() => { setEditingTrip(trip); setShowForm(false); window.scrollTo(0, 0); }}>✏️ Изменить</button>
                  <button className="btn btn-ghost danger" onClick={() => handleDelete(trip.id)}>🗑️ Удалить</button>
                </>
              )}
              {canBook(trip) &&
                (myBooked[trip.id] ? (
                  <Link to="/my-bookings" className="booked-link">✅ Забронировано {seatsText(myBooked[trip.id])}</Link>
                ) : (
                  <SeatsBooking trip={trip} onBooked={handleBooked} />
                ))}
            </TripCard>
          ))}
        </ul>
      )}

      {meta.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={query.page <= 1} onClick={() => goToPage(query.page - 1)}>← Назад</button>
          <span>Страница {query.page} из {meta.pages}</span>
          <button className="btn btn-ghost" disabled={query.page >= meta.pages} onClick={() => goToPage(query.page + 1)}>Вперёд →</button>
        </div>
      )}
    </div>
  );
}

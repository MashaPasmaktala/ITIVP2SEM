import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchTrip, setTripStatus, addStop, removeStop, addReview, updateReview, deleteReview } from '../api';
import { useAuth } from '../context/AuthContext';
import { errText, formatDate, formatTime, driverName, seatsText, OPTION_LABELS, STATUS_LABELS } from '../utils';
import SeatsBooking from '../components/SeatsBooking';
import Stars from '../components/Stars';

// Форма отзыва (новый или редактирование своего)
function ReviewForm({ initial, onSubmit, onCancel }) {
  const [rating, setRating] = useState(initial?.rating || 5);
  const [comment, setComment] = useState(initial?.comment || '');
  return (
    <form
      className="review-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ rating, comment });
      }}
    >
      <div className="star-picker">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n} звёзд`}>★</button>
        ))}
      </div>
      <textarea rows="3" placeholder="Как прошла поездка?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{initial ? 'Сохранить' : 'Оставить отзыв'}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}

export default function TripDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingReview, setEditingReview] = useState(null);
  const [newStop, setNewStop] = useState('');

  const load = useCallback(
    () =>
      fetchTrip(id)
        .then((res) => {
          setTrip(res.data);
          setError('');
        })
        .catch((err) => setError(errText(err, 'Не удалось загрузить поездку'))),
    [id]
  );

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Обёртка для действий: выполнить запрос, показать ошибку, перезагрузить поездку
  const run = (fn) => async (...args) => {
    try {
      await fn(...args);
      await load();
    } catch (err) {
      alert(errText(err));
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="card error-banner">{error} <Link to="/">← К поездкам</Link></div>;

  const isOwner = user && trip.driver?.id === user.id;
  const canManage = user?.role === 'admin' || isOwner;
  const isFuture = trip.status === 'scheduled' && new Date(trip.departureAt) > new Date();
  const canBook = isFuture && !isOwner && (user?.role === 'user' || user?.role === 'driver');
  const myReview = user && trip.reviews.find((r) => r.author === user.id);
  const canReview = trip.myBooking && !myReview && !isOwner;

  const handleStatus = run((status) => {
    const text = status === 'cancelled' ? 'Отменить поездку? Все брони будут отменены.' : 'Отметить поездку как завершённую?';
    if (!window.confirm(text)) return Promise.resolve();
    return setTripStatus(trip.id, status);
  });
  const handleAddStop = run(async (e) => {
    e.preventDefault();
    if (!newStop.trim()) return;
    await addStop(trip.id, { city: newStop.trim() }); // $push в массив stops
    setNewStop('');
  });
  const handleRemoveStop = run((stopId) => removeStop(trip.id, stopId)); // $pull из массива stops
  const handleAddReview = run((data) => addReview(trip.id, data));
  const handleUpdateReview = run(async (data) => {
    await updateReview(trip.id, editingReview, data); // позиционный оператор reviews.$
    setEditingReview(null);
  });
  const handleDeleteReview = run((reviewId) =>
    window.confirm('Удалить отзыв?') ? deleteReview(trip.id, reviewId) : Promise.resolve()
  );

  return (
    <div className="trip-details">
      <Link to="/" className="back">← Все поездки</Link>

      <div className="details-grid">
        <div className="card">
          <div className="details-head">
            <div>
              <div className="muted">{formatDate(trip.departureAt)}</div>
              <h1>{trip.from} → {trip.to}</h1>
            </div>
            <span className={`status status-${trip.status}`}>{STATUS_LABELS[trip.status]}</span>
          </div>

          {/* Маршрут с остановками (массив stops) */}
          <ol className="timeline">
            <li><strong>{formatTime(trip.departureAt)}</strong> {trip.from}</li>
            {trip.stops.map((s) => (
              <li key={s._id}>
                {s.time && <strong>{formatTime(s.time)}</strong>} {s.city}
                {canManage && trip.status === 'scheduled' && (
                  <button className="link danger" onClick={() => handleRemoveStop(s._id)} title="Удалить остановку">✕</button>
                )}
              </li>
            ))}
            <li>{trip.to}</li>
          </ol>
          {canManage && trip.status === 'scheduled' && (
            <form className="inline-form" onSubmit={handleAddStop}>
              <input placeholder="Добавить остановку" value={newStop} onChange={(e) => setNewStop(e.target.value)} />
              <button className="btn btn-ghost" type="submit">+ Остановка</button>
            </form>
          )}

          {trip.description && <p className="description">{trip.description}</p>}

          {/* Вложенный документ options */}
          <ul className="options">
            {Object.entries(OPTION_LABELS).map(([key, [yes, no]]) => (
              <li key={key}>{trip.options?.[key] ? yes : no}</li>
            ))}
          </ul>
          {trip.tags.length > 0 && <div className="tags">{trip.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}
        </div>

        <aside className="side">
          <div className="card price-card">
            <div className="big-price">{trip.price} BYN</div>
            <div className="muted">за одно место</div>
            <div className={trip.seats > 0 ? 'seats-ok' : 'seats-none'}>
              Свободно {seatsText(trip.seats)} из {trip.seatsTotal}
            </div>
            {trip.myBooking ? (
              <div className="booked">✅ У вас забронировано {seatsText(trip.myBooking.seats)}. <Link to="/my-bookings">Мои брони</Link></div>
            ) : canBook ? (
              <SeatsBooking trip={trip} onBooked={() => load()} />
            ) : !user && isFuture ? (
              <Link to="/login" className="btn btn-primary btn-block">Войдите, чтобы забронировать</Link>
            ) : null}
          </div>

          <div className="card driver-card">
            <h3>Водитель</h3>
            {trip.driver ? (
              <>
                <Link to={`/users/${trip.driver.id}`} className="driver-name">👤 {driverName(trip.driver)}</Link>
                {trip.driverRating?.reviewsCount > 0 ? (
                  <div><Stars value={trip.driverRating.avgRating} /> {trip.driverRating.avgRating} ({trip.driverRating.reviewsCount} отз.)</div>
                ) : (
                  <div className="muted small">Пока нет отзывов</div>
                )}
                {trip.driver.car && (
                  <div className="car">🚘 {trip.driver.car.brand} {trip.driver.car.model}{trip.driver.car.color && `, ${trip.driver.car.color.toLowerCase()}`}</div>
                )}
                {(trip.myBooking || canManage) && trip.driver.profile?.phone && <div>📞 {trip.driver.profile.phone}</div>}
              </>
            ) : (
              <div className="muted">Не назначен</div>
            )}
          </div>

          {canManage && (
            <div className="card">
              <h3>Управление</h3>
              <h4>Пассажиры ({trip.passengers?.length || 0})</h4>
              {trip.passengers?.length ? (
                <ul className="plain">
                  {trip.passengers.map((p) => (
                    <li key={p.bookingId}>
                      {p.user?.profile?.name || p.user?.email} — {seatsText(p.seats)}
                      {p.user?.profile?.phone && <span className="muted small"> · {p.user.profile.phone}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Пока никто не забронировал</p>
              )}
              {trip.status === 'scheduled' && (
                <div className="form-actions">
                  <button className="btn btn-ghost" onClick={() => handleStatus('completed')}>✔ Завершить</button>
                  <button className="btn btn-ghost danger" onClick={() => handleStatus('cancelled')}>✕ Отменить</button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Отзывы — массив reviews внутри документа поездки */}
      <section className="card" id="reviews">
        <h2>Отзывы {trip.rating > 0 && <span className="muted">· <Stars value={trip.rating} /> {trip.rating}</span>}</h2>
        {canReview && <ReviewForm onSubmit={handleAddReview} />}
        {trip.reviews.length === 0 ? (
          <p className="muted">Отзывов пока нет.</p>
        ) : (
          <ul className="reviews">
            {trip.reviews.map((r) =>
              editingReview === r._id ? (
                <li key={r._id}><ReviewForm initial={r} onSubmit={handleUpdateReview} onCancel={() => setEditingReview(null)} /></li>
              ) : (
                <li key={r._id}>
                  <div className="review-head">
                    <strong>{r.authorName}</strong> <Stars value={r.rating} />
                    <span className="muted small">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p>{r.comment}</p>}
                  {(r.author === user?.id || user?.role === 'admin') && (
                    <div className="review-actions">
                      {r.author === user?.id && <button className="link" onClick={() => setEditingReview(r._id)}>Изменить</button>}
                      <button className="link danger" onClick={() => handleDeleteReview(r._id)}>Удалить</button>
                    </div>
                  )}
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

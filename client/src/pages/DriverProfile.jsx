import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicProfile } from '../api';
import { errText, formatDate, ROLE_LABELS } from '../utils';
import Stars from '../components/Stars';

// Публичный профиль водителя: рейтинг считается на сервере через aggregation
export default function DriverProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicProfile(id)
      .then((res) => setData(res.data))
      .catch((err) => setError(errText(err)));
  }, [id]);

  if (error) return <div className="card error-banner">{error}</div>;
  if (!data) return <div className="loading">Загрузка...</div>;

  return (
    <div className="profile">
      <Link to="/" className="back">← Все поездки</Link>
      <div className="card">
        <div className="profile-head">
          <div className="avatar">{data.name[0].toUpperCase()}</div>
          <div>
            <h1>{data.name}</h1>
            <span className={`badge badge-${data.role}`}>{ROLE_LABELS[data.role]}</span>
            {data.city && <span className="muted"> · {data.city}</span>}
            <div className="muted small">На сервисе с {new Date(data.memberSince).toLocaleDateString('ru-RU')}</div>
          </div>
        </div>
        {data.bio && <p className="description">{data.bio}</p>}
        <div className="stat-cards">
          <div className="stat"><span>Рейтинг</span><strong>{data.avgRating || '—'}</strong>{data.avgRating > 0 && <Stars value={data.avgRating} />}</div>
          <div className="stat"><span>Отзывов</span><strong>{data.reviewsCount}</strong></div>
          <div className="stat"><span>Поездок</span><strong>{data.tripsCount}</strong></div>
        </div>
        {data.car && <p>🚘 {data.car.brand} {data.car.model} {data.car.year && `(${data.car.year})`} {data.car.color && `· ${data.car.color}`}</p>}
      </div>

      <div className="card">
        <h2>Последние отзывы</h2>
        {data.lastReviews.length === 0 ? (
          <p className="muted">Отзывов пока нет.</p>
        ) : (
          <ul className="reviews">
            {data.lastReviews.map((r) => (
              <li key={r._id}>
                <div className="review-head">
                  <strong>{r.authorName}</strong> <Stars value={r.rating} />
                  <span className="muted small">{r.route} · {formatDate(r.createdAt)}</span>
                </div>
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

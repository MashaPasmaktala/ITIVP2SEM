import { Link } from 'react-router-dom';
import { formatDate, formatTime, driverName, seatsText, STATUS_LABELS } from '../utils';
import Stars from './Stars';

// Карточка поездки в списке
export default function TripCard({ trip, children }) {
  return (
    <li className={`trip-card ${trip.status !== 'scheduled' ? 'trip-card-muted' : ''}`}>
      <Link to={`/trips/${trip.id}`} className="trip-card-main">
        <div className="trip-time">
          <strong>{formatTime(trip.departureAt)}</strong>
          <span>{formatDate(trip.departureAt).split(',').slice(0, 2).join(',')}</span>
        </div>
        <div className="trip-route">
          <div className="route-line">
            <strong>{trip.from}</strong>
            <span className="arrow">→</span>
            <strong>{trip.to}</strong>
          </div>
          {trip.stops?.length > 0 && <div className="muted small">через {trip.stops.map((s) => s.city).join(', ')}</div>}
          <div className="trip-driver">
            👤 {driverName(trip.driver)}
            {trip.driver?.car && <span className="muted"> · {trip.driver.car.brand} {trip.driver.car.model}</span>}
            {trip.rating > 0 && <> · <Stars value={trip.rating} /></>}
          </div>
          {trip.tags?.length > 0 && (
            <div className="tags">{trip.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>
          )}
        </div>
        <div className="trip-price">
          <strong>{trip.price} BYN</strong>
          <span className={trip.seats > 0 ? 'seats-ok' : 'seats-none'}>
            {trip.status !== 'scheduled' ? STATUS_LABELS[trip.status] : trip.seats > 0 ? `${seatsText(trip.seats)} свободно` : 'Мест нет'}
          </span>
        </div>
      </Link>
      {children && <div className="trip-card-actions">{children}</div>}
    </li>
  );
}

import { useState } from 'react';
import { buyTicket } from '../api';
import { errText } from '../utils';

// Выбор количества мест + кнопка «Забронировать»
export default function SeatsBooking({ trip, onBooked }) {
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const max = Math.min(trip.seats, 4);

  const handleBuy = async () => {
    setBusy(true);
    try {
      const res = await buyTicket(trip.id, seats);
      onBooked?.(res.data);
    } catch (err) {
      alert(errText(err, 'Не удалось забронировать'));
    } finally {
      setBusy(false);
    }
  };

  if (trip.seats <= 0) return <button className="btn btn-buy" disabled>Нет мест</button>;

  return (
    <div className="seats-booking">
      <select value={seats} onChange={(e) => setSeats(Number(e.target.value))} aria-label="Количество мест">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n} {n === 1 ? 'место' : 'места'}</option>
        ))}
      </select>
      <button className="btn btn-buy" onClick={handleBuy} disabled={busy}>
        {busy ? '...' : `Забронировать · ${trip.price * seats} BYN`}
      </button>
    </div>
  );
}

import { useState } from 'react';
import { toLocalInput } from '../utils';

const EMPTY = {
  from: '',
  to: '',
  departureAt: '',
  price: '',
  seatsTotal: '3',
  stops: '',
  tags: '',
  description: '',
  options: { smoking: false, pets: false, luggage: true, music: true },
};

// Перевести поездку с сервера в значения формы
const toForm = (trip) =>
  trip
    ? {
        from: trip.from,
        to: trip.to,
        departureAt: toLocalInput(trip.departureAt),
        price: String(trip.price),
        seatsTotal: String(trip.seatsTotal),
        stops: (trip.stops || []).map((s) => s.city).join(', '),
        tags: (trip.tags || []).join(', '),
        description: trip.description || '',
        options: { ...EMPTY.options, ...trip.options },
      }
    : EMPTY;

// Форма создания / редактирования поездки (для водителя и админа)
export default function TripForm({ trip, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => toForm(trip));
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleOption = (key) => setForm({ ...form, options: { ...form.options, [key]: !form.options[key] } });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      from: form.from.trim(),
      to: form.to.trim(),
      departureAt: new Date(form.departureAt).toISOString(), // локальное время → UTC для сервера
      price: Number(form.price),
      seatsTotal: Number(form.seatsTotal),
      stops: form.stops.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tags,
      description: form.description,
      options: form.options,
    });
    if (!trip) setForm(EMPTY);
  };

  return (
    <form className="trip-form card" onSubmit={handleSubmit}>
      <h2>{trip ? '✏️ Редактировать поездку' : '➕ Опубликовать поездку'}</h2>
      <div className="form-grid">
        <label>Откуда<input name="from" placeholder="Минск" value={form.from} onChange={handleChange} required /></label>
        <label>Куда<input name="to" placeholder="Брест" value={form.to} onChange={handleChange} required /></label>
        <label>Отправление<input type="datetime-local" name="departureAt" value={form.departureAt} onChange={handleChange} required /></label>
        <label>Цена за место, BYN<input type="number" name="price" min="0" value={form.price} onChange={handleChange} required /></label>
        <label>Мест для пассажиров<input type="number" name="seatsTotal" min="1" max="8" value={form.seatsTotal} onChange={handleChange} required /></label>
        <label>Остановки (через запятую)<input name="stops" placeholder="Барановичи, Ивацевичи" value={form.stops} onChange={handleChange} /></label>
        <label className="span-2">Теги (через запятую)<input name="tags" placeholder="комфорт, утро" value={form.tags} onChange={handleChange} /></label>
        <label className="span-2">Комментарий<textarea name="description" rows="2" placeholder="Где встречаемся, условия..." value={form.description} onChange={handleChange} /></label>
      </div>
      <div className="checks">
        {[
          ['smoking', 'Можно курить'],
          ['pets', 'Можно с животными'],
          ['luggage', 'Есть место для багажа'],
          ['music', 'Музыка'],
        ].map(([key, label]) => (
          <label key={key} className="check">
            <input type="checkbox" checked={form.options[key]} onChange={() => toggleOption(key)} /> {label}
          </label>
        ))}
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{trip ? 'Сохранить' : 'Опубликовать'}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  );
}

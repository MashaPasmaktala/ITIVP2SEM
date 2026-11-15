// Текст ошибки из ответа сервера
export const errText = (err, fallback = 'Что-то пошло не так') => err?.response?.data?.error || fallback;

// Дата для показа: «пн, 16 нояб., 08:30» — в ЛОКАЛЬНОМ часовом поясе
// (раньше использовался toISOString(), который показывал время по UTC и «сдвигал» его на 3 часа)
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

// Значение для <input type="datetime-local"> в локальном времени
export const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const driverName = (driver) => driver?.profile?.name || driver?.email?.split('@')[0] || 'Водитель не назначен';

// «1 место», «2 места», «5 мест»
export const plural = (n, [one, few, many]) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
};
export const seatsText = (n) => plural(n, ['место', 'места', 'мест']);

export const STATUS_LABELS = {
  scheduled: 'Запланирована',
  completed: 'Завершена',
  cancelled: 'Отменена',
  active: 'Активна',
};

export const ROLE_LABELS = { user: 'Пассажир', driver: 'Водитель', admin: 'Админ' };

export const OPTION_LABELS = {
  smoking: ['🚬 Можно курить', '🚭 Не курить'],
  pets: ['🐾 Можно с животными', '🚫🐾 Без животных'],
  luggage: ['🧳 Есть место для багажа', '🎒 Только ручная кладь'],
  music: ['🎵 Музыка в дороге', '🤫 Тишина'],
};

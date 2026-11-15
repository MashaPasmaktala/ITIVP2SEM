import { useState, useEffect, useCallback } from 'react';
import { getAdminStats, getAdminUsers, setUserRole, setUserBlocked, deleteUser } from '../api';
import { useAuth } from '../context/AuthContext';
import { errText, ROLE_LABELS, STATUS_LABELS } from '../utils';

export default function AdminPanel() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadStats = useCallback(
    () => getAdminStats().then((res) => setStats(res.data)).catch((err) => alert(errText(err))),
    []
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      getAdminUsers({ role: roleFilter || undefined, q: search || undefined })
        .then((res) => setUsers(res.data))
        .catch((err) => alert(errText(err)));
    }, 300); // небольшая задержка, чтобы не слать запрос на каждую букву
    return () => clearTimeout(timer);
  }, [roleFilter, search]);

  const replaceUser = (updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const handleRole = async (id, role) => {
    try {
      replaceUser((await setUserRole(id, role)).data);
      loadStats();
    } catch (err) {
      alert(errText(err));
    }
  };

  const handleBlock = async (u) => {
    try {
      replaceUser((await setUserBlocked(u.id, !u.isBlocked)).data);
    } catch (err) {
      alert(errText(err));
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Удалить ${u.email}? Его поездки и брони тоже будут удалены.`)) return;
    try {
      await deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      loadStats();
    } catch (err) {
      alert(errText(err));
    }
  };

  return (
    <div className="admin">
      <h1>📊 Панель администратора</h1>

      {stats && (
        <>
          <div className="stat-cards">
            <div className="stat"><span>Выручка (активные брони)</span><strong>{stats.revenue} BYN</strong></div>
            <div className="stat"><span>Продано мест</span><strong>{stats.seatsSold}</strong></div>
            <div className="stat"><span>Средняя загрузка</span><strong>{stats.avgLoad}%</strong></div>
            <div className="stat"><span>Средний рейтинг</span><strong>{stats.avgRating || '—'}</strong></div>
          </div>
          <div className="details-grid">
            <div className="card">
              <h3>🔥 Топ направлений</h3>
              {stats.topRoutes.length === 0 ? (
                <p className="muted">Нет данных</p>
              ) : (
                <table className="table">
                  <thead><tr><th>Маршрут</th><th>Мест</th><th>Выручка</th></tr></thead>
                  <tbody>
                    {stats.topRoutes.map((r) => (
                      <tr key={`${r.from}-${r.to}`}><td>{r.from} → {r.to}</td><td>{r.seats}</td><td>{r.revenue} BYN</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card">
              <h3>Пользователи</h3>
              <ul className="plain">
                {Object.entries(stats.users).map(([role, count]) => <li key={role}>{ROLE_LABELS[role] || role}: <strong>{count}</strong></li>)}
              </ul>
              <h3>Поездки</h3>
              <ul className="plain">
                {Object.entries(stats.trips).map(([status, count]) => <li key={status}>{STATUS_LABELS[status] || status}: <strong>{count}</strong></li>)}
              </ul>
              <p className="muted small">Активных броней: {stats.bookings} · Средняя цена: {stats.avgPrice} BYN</p>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="list-header">
          <h3>Управление пользователями</h3>
          <div className="inline-form">
            <input placeholder="Поиск по email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Все роли</option>
              <option value="user">Пассажиры</option>
              <option value="driver">Водители</option>
              <option value="admin">Админы</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Имя</th><th>Роль</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.isBlocked ? 'row-blocked' : ''}>
                  <td>{u.email}</td>
                  <td>{u.profile?.name}</td>
                  <td>
                    <select value={u.role} disabled={u.id === me.id} onChange={(e) => handleRole(u.id, e.target.value)}>
                      <option value="user">Пассажир</option>
                      <option value="driver">Водитель</option>
                      <option value="admin">Админ</option>
                    </select>
                  </td>
                  <td>{u.isBlocked ? '🚫 Заблокирован' : 'Активен'}</td>
                  <td className="nowrap">
                    {u.id !== me.id && (
                      <>
                        <button className="link" onClick={() => handleBlock(u)}>{u.isBlocked ? 'Разблокировать' : 'Заблокировать'}</button>
                        <button className="link danger" onClick={() => handleDelete(u)}>Удалить</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import axios from 'axios';

// Адрес API берётся из client/.env (VITE_API_URL), по умолчанию — локальный сервер
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // передаёт HttpOnly cookie с JWT
});

// --- Авторизация ---
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const logoutUser = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// --- Поездки ---
export const fetchTrips = (params, config) => api.get('/trips', { params, ...config });
export const fetchTrip = (id) => api.get(`/trips/${id}`);
export const createTrip = (trip) => api.post('/trips', trip);
export const updateTrip = (id, trip) => api.put(`/trips/${id}`, trip);
export const deleteTrip = (id) => api.delete(`/trips/${id}`);
export const setTripStatus = (id, status) => api.patch(`/trips/${id}/status`, { status });
export const addStop = (id, stop) => api.post(`/trips/${id}/stops`, stop);
export const removeStop = (id, stopId) => api.delete(`/trips/${id}/stops/${stopId}`);
export const fetchMyDriverTrips = () => api.get('/trips/driver/mine');

// --- Отзывы ---
export const addReview = (tripId, review) => api.post(`/trips/${tripId}/reviews`, review);
export const updateReview = (tripId, reviewId, review) => api.patch(`/trips/${tripId}/reviews/${reviewId}`, review);
export const deleteReview = (tripId, reviewId) => api.delete(`/trips/${tripId}/reviews/${reviewId}`);

// --- Брони ---
export const buyTicket = (id, seats = 1) => api.post(`/trips/${id}/book`, { seats });
export const getMyBookings = () => api.get('/trips/my-bookings');
export const changeBookingSeats = (id, seats) => api.patch(`/trips/my-bookings/${id}`, { seats });
export const cancelBooking = (id) => api.delete(`/trips/my-bookings/${id}`);

// --- Профиль ---
export const getProfile = () => api.get('/profile');
export const updateProfile = (data) => api.put('/profile', data);
export const changePassword = (data) => api.put('/profile/password', data);
export const becomeDriver = (data) => api.post('/profile/become-driver', data);
export const getPublicProfile = (id) => api.get(`/users/${id}/public`);

// --- Админка ---
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const setUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const setUserBlocked = (id, isBlocked) => api.patch(`/admin/users/${id}/block`, { isBlocked });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

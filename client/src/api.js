import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Важно! Передает HttpOnly cookie с токеном
});

export const fetchTrips = () => api.get('/trips');
export const createTrip = (trip) => api.post('/trips', trip);
export const updateTrip = (id, trip) => api.put(`/trips/${id}`, trip);
export const deleteTrip = (id) => api.delete(`/trips/${id}`);
export const buyTicket = (id) => api.post(`/trips/${id}/book`);
export const cancelBooking = (id) => api.delete(`/trips/my-bookings/${id}`);
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const getMyBookings = () => api.get('/trips/my-bookings');
import { http } from '@/services/http/client';

// Authentication always goes through the real Express API.
export const loginUser = (credentials) => http.post('/user/login', credentials);
export const logoutUser = () => http.post('/user/logout');

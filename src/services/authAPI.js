import API from './axiosInstance';

// Leading slashes keep real and mock adapters consistent.
export const loginUser = (credentials) => API.post('/user/login', credentials);
export const logoutUser = () => API.post('/user/logout');

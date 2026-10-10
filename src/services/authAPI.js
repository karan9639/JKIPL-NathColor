import API from './axiosInstance';
const loginUser = async (userData) => API.post('user/login', userData);
const logoutUser = async () => API.post('user/logout');
export { loginUser, logoutUser };

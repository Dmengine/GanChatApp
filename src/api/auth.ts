import axios from './axios';

export const registerUser = (data: { username: string; email: string; password: string }) => axios.post('/register', data);
export const loginUser = (data: { email: string; password: string }) => axios.post('/login', data);

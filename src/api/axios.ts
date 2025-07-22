import axios from 'axios';
import { SERVER_URL } from './global';

const instance = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
import io from 'socket.io-client';

const token = localStorage.getItem('token');

// const socket = io('https://api-chatapp.onrender.com', {
//  auth: { token },);

const socket = io('http://localhost:5001', {
  auth: { token },
});

export default socket;

// this file sets up a pre-configured axios instance for making API calls to the backend server. It includes the base URL, credentials, and default headers for JSON content. This allows for cleaner and more consistent API calls throughout the React application.
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;

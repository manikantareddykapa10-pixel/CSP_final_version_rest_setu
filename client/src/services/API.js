import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_BASEURL || (
    process.env.NODE_ENV === "production" ? "/api/v1" : "http://localhost:8080/api/v1"
  ),
});

API.interceptors.request.use((request) => {
  const token = localStorage.getItem("token");
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  return request;
});

export default API;

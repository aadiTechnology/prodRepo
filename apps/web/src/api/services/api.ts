import axios from "axios";
import { apiBaseUrl } from "../../config";

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
import axios from "axios";

// points to the python backend
const API_BASE_URL = "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// function to trigger analysis
export const analyzeProfile = async (url, forceRefresh = false) => {
  const response = await api.post("/analyze", { url, is_cs_ai: true, forceRefresh: forceRefresh });
  return response.data;
};

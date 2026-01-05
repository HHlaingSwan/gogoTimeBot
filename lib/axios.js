import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const baseUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
console.log("baseUrl", baseUrl);

const api = () => {
  return {
    get(method, params) {
      return axios.get(`${baseUrl}/${method}`, { params });
    },
    post(method, data) {
      return axios.post(`${baseUrl}/${method}`, data);
    },
  };
};

export default api;

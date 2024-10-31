import axios, { AxiosInstance } from "axios";

function createAxiosInstance(): AxiosInstance {
  const client = axios.create({
    baseURL: "",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return client;
}

export const client = createAxiosInstance();

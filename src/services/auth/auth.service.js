import { http } from "@/services/http/client";

// The shared `http` client already routes through the mock adapter when no
// backend base URL is configured, and through the real API otherwise. Keeping
// authentication on that one client means email login works identically in
// demo (mock) mode and in production.
export const loginUser = (credentials) => http.post("/user/login", credentials);
export const logoutUser = () => http.post("/user/logout");

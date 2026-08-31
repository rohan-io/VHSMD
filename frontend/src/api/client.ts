import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const TOKEN_KEY = "mch_auth_token";
export const USER_KEY = "mch_user_profile";
export const OFFLINE_MODE_KEY = "mch_simulated_offline_mode";
export const OFFLINE_QUEUE_KEY = "mch_offline_sync_queue";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function getAuthToken(): Promise<string | null> {
  return await storage.secureGet<string>(TOKEN_KEY, null);
}

export async function setAuthToken(token: string): Promise<boolean> {
  return await storage.secureSet<string>(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<boolean> {
  return await storage.secureRemove(TOKEN_KEY);
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    isFormData?: boolean;
  } = {}
): Promise<T> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (!options.isFormData && options.body && typeof options.body === "object") {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = options.isFormData
      ? options.body
      : JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);

    if (res.status === 401) {
      await removeAuthToken();
      await storage.removeItem(USER_KEY);
      throw new ApiError("Session expired. Please log in again.", 401);
    }

    if (!res.ok) {
      let errMsg = `Request failed (${res.status})`;
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errJson.message || errMsg;
      } catch {
        errMsg = await res.text();
      }
      throw new ApiError(errMsg, res.status);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || "Network request failed. Check server connection.",
      0
    );
  }
}

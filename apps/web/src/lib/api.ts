import type { ApiErrorResponse } from "@workspace/contracts";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3456";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestBody = object | unknown[] | null;

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const apiError = data as ApiErrorResponse | null;
    throw new ApiError(
      response.status,
      apiError?.error?.code ?? "request_failed",
      apiError?.error?.message ?? "Request failed",
    );
  }

  return data as T;
}

async function request<T>(method: string, path: string, body?: RequestBody): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: RequestBody) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: RequestBody) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: RequestBody) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

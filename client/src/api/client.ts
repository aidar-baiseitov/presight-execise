import type { DirectoryState, FacetsResponse, Filters, UserListResponse } from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

/** Selected values are sent as repeated params so values containing commas stay intact. */
function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  for (const nationality of filters.nationalities) params.append("nationality", nationality);
  for (const hobby of filters.hobbies) params.append("hobby", hobby);
  return params;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function fetchUsers(
  state: DirectoryState,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<UserListResponse> {
  const params = filterParams(state);
  params.set("sort", state.sort);
  params.set("order", state.order);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return request<UserListResponse>(`/api/users?${params.toString()}`, signal);
}

export function fetchFacets(filters: Filters, signal?: AbortSignal): Promise<FacetsResponse> {
  return request<FacetsResponse>(`/api/facets?${filterParams(filters).toString()}`, signal);
}

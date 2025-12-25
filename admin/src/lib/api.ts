/**
 * API клиент для админки.
 */

const API_URL = "http://localhost:8000";

/**
 * Получить токен из localStorage.
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

/**
 * Базовый fetch с авторизацией.
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Токен невалидный — редирект на логин
    localStorage.removeItem("admin_token");
    window.location.href = "/login";
  }

  return response;
}

// === Типы ===

export interface PlotListItem {
  id: number;
  cadastral_number: string | null;
  area: number | null;
  address: string | null;
  price_public: number | null;
  price_per_sotka: number | null;
  status: "active" | "sold" | "reserved";
  has_geometry: boolean;
  centroid_coords: [number, number] | null;  // [lon, lat]
  land_use: { id: number; code: string; name: string } | null;
  land_category: { id: number; code: string; name: string } | null;
  listing: { id: number; slug: string; title: string } | null;
  created_at: string;
  updated_at: string;
}

export interface PlotListResponse {
  items: PlotListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PlotFilters {
  search?: string;
  status?: string;
  has_geometry?: boolean;
  area_min?: number;
  area_max?: number;
  listing_id?: number;
  sort?: string;
  page?: number;
  size?: number;
}

export interface PlotCreate {
  listing_id?: number | null;
  cadastral_number?: string | null;
  land_use_id?: number | null;
  land_category_id?: number | null;
  area?: number | null;
  address?: string | null;
  price_public?: number | null;
  price_per_sotka?: number | null;
  price_private?: number | null;
  price_per_sotka_private?: number | null;
  status?: "active" | "sold" | "reserved";
  owner_id?: number | null;
}

// === API функции ===

export async function getPlots(filters: PlotFilters = {}): Promise<PlotListResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.has_geometry !== undefined) params.set("has_geometry", String(filters.has_geometry));
  if (filters.area_min) params.set("area_min", String(filters.area_min));
  if (filters.area_max) params.set("area_max", String(filters.area_max));
  if (filters.listing_id) params.set("listing_id", String(filters.listing_id));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size) params.set("size", String(filters.size));

  const response = await fetchWithAuth(`/api/admin/plots?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ошибка загрузки участков");
  }
  return response.json();
}

export async function getPlot(id: number): Promise<PlotListItem> {
  const response = await fetchWithAuth(`/api/admin/plots/${id}`);
  if (!response.ok) {
    throw new Error("Участок не найден");
  }
  return response.json();
}

export interface CadastralCheckResult {
  exists: boolean;
  plot_id?: number;
  address?: string;
  status?: string;
}

export async function checkCadastralNumber(
  cadastralNumber: string,
  excludeId?: number
): Promise<CadastralCheckResult> {
  const params = new URLSearchParams({ cadastral_number: cadastralNumber });
  if (excludeId) params.set("exclude_id", String(excludeId));

  const response = await fetchWithAuth(`/api/admin/plots/check-cadastral?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ошибка проверки кадастрового номера");
  }
  return response.json();
}

export async function createPlot(data: PlotCreate): Promise<PlotListItem> {
  const response = await fetchWithAuth("/api/admin/plots/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка создания участка");
  }
  return response.json();
}

export async function updatePlot(id: number, data: PlotCreate): Promise<PlotListItem> {
  const response = await fetchWithAuth(`/api/admin/plots/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка обновления участка");
  }
  return response.json();
}

export async function deletePlot(id: number): Promise<void> {
  const response = await fetchWithAuth(`/api/admin/plots/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Ошибка удаления участка");
  }
}

export async function bulkDeletePlots(ids: number[]): Promise<{ deleted_count: number }> {
  const response = await fetchWithAuth("/api/admin/plots/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error("Ошибка массового удаления");
  }
  return response.json();
}

export async function fetchGeometry(plotId: number): Promise<PlotListItem> {
  const response = await fetchWithAuth(`/api/admin/plots/${plotId}/fetch-geometry`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка получения координат");
  }
  return response.json();
}

// === Справочники ===

export interface Reference {
  id: number;
  code: string;
  name: string;
}

export async function getReferences(type: string): Promise<Reference[]> {
  const response = await fetch(`${API_URL}/api/references?type=${type}`);
  if (!response.ok) {
    throw new Error("Ошибка загрузки справочников");
  }
  return response.json();
}

// === Настройки ===

export interface SettingItem {
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string | null;
}

export interface SettingsResponse {
  items: SettingItem[];
}

export async function getSettings(): Promise<SettingsResponse> {
  const response = await fetchWithAuth("/api/admin/settings/");
  if (!response.ok) {
    throw new Error("Ошибка загрузки настроек");
  }
  return response.json();
}

export async function updateSetting(key: string, value: string | null): Promise<SettingItem> {
  const response = await fetchWithAuth(`/api/admin/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка обновления настройки");
  }
  return response.json();
}

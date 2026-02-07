/**
 * API клиент для админки.
 */

// Используем переменную окружения для API URL, с fallback на localhost для разработки
const IS_SERVER = typeof window === "undefined";
export const API_URL = IS_SERVER
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001")
  : (process.env.NEXT_PUBLIC_API_URL || (window.location.hostname === "localhost" ? "http://localhost:8001" : ""));

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
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

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
  comment: string | null;
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
  search?: string;           // Поиск по кадастровому номеру
  address_search?: string;   // Поиск по адресу
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
  comment?: string | null;
}

// === Гео API ===

export interface DaDataSuggestion {
  value: string;
  unrestricted_value: string;
  data: any;
}

export interface ResolveData {
  name: string;
  type?: string | null;
  district_name?: string | null;
  district_fias_id?: string | null;
  settlement_fias_id?: string | null;
  region_name?: string | null;
}

export interface SettlementResolved {
  id: number;
  name: string;
  full_name: string;
}

export interface SuggestionResponse {
  suggestions: DaDataSuggestion[];
}

// === API функции ===

export async function getPlots(filters: PlotFilters = {}): Promise<PlotListResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.address_search) params.set("address_search", filters.address_search);
  if (filters.status) params.set("status", filters.status);
  if (filters.has_geometry !== undefined) params.set("has_geometry", String(filters.has_geometry));
  if (filters.area_min) params.set("area_min", String(filters.area_min));
  if (filters.area_max) params.set("area_max", String(filters.area_max));
  if (filters.listing_id) params.set("listing_id", String(filters.listing_id));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size) params.set("size", String(filters.size));

  const response = await fetchWithAuth(`/api/admin/plots/?${params.toString()}`);
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
  const response = await fetchWithAuth("/api/admin/plots/bulk-delete/", {
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
  const response = await fetch(`${API_URL}/api/references/?type=${type}`);
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

// === Объявления (Listings) ===

export interface DistrictItem {
  id: number;
  name: string;
  slug: string;
}

export interface SettlementItem {
  id: number;
  name: string;
  slug: string;
  district: DistrictItem | null;
}

// NEW: Иерархическая модель локаций
export interface LocationItem {
  id: number;
  name: string;
  slug: string;
  type: string;  // "region" | "district" | "city" | "settlement"
  parent: LocationItem | null;
}

export interface RealtorItem {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export interface RealtorCreate {
  name: string;
  phone: string;
  email?: string | null;
  is_active?: boolean;
}

export interface RealtorUpdate {
  name?: string;
  phone?: string;
  email?: string | null;
  is_active?: boolean;
}

export interface RealtorsResponse {
  items: RealtorItem[];
  total: number;
}

export interface PlotShortItem {
  id: number;
  cadastral_number: string | null;
  area: number | null;
  address: string | null;
  price_public: number | null;
  status: string;
  land_use: { id: number; code: string; name: string } | null;
  comment: string | null;  // Комментарий к участку
}

export interface ListingListItem {
  id: number;
  slug: string;
  title: string;
  cadastral_numbers: string[];
  is_published: boolean;
  is_featured: boolean;
  settlement: SettlementItem | null;  // deprecated
  location: LocationItem | null;       // NEW: иерархическая локация
  location_id: number | null;          // NEW
  realtor: RealtorItem;
  plots_count: number;
  total_area: number | null;
  area_min: number | null;
  area_max: number | null;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: number;
  url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface ListingDetail {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_featured: boolean;
  title_auto: boolean;
  settlement_id: number | null;  // deprecated
  settlement: SettlementItem | null;  // deprecated
  location_id: number | null;    // NEW
  location: { id: number; name: string; slug: string } | null;  // NEW
  realtor_id: number;
  realtor: RealtorItem;
  meta_title: string | null;
  meta_description: string | null;
  plots: PlotShortItem[];
  images: Image[];
  plots_count: number;
  total_area: number | null;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListingListResponse {
  items: ListingListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ListingFilters {
  search?: string;
  cadastral_search?: string;
  settlement_id?: number;  // deprecated, kept for compatibility
  location_id?: number;    // NEW: ID из таблицы locations
  is_published?: boolean;
  is_featured?: boolean;
  sort?: string;
  page?: number;
  size?: number;
}

export interface ListingCreate {
  title: string;
  description?: string | null;
  realtor_id: number;
  settlement_id?: number | null;  // deprecated, use location_id
  location_id?: number | null;    // NEW: иерархическая локация
  is_published?: boolean;
  is_featured?: boolean;
  title_auto?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  plot_ids?: number[];
  image_ids?: number[];
}

export interface ListingUpdate {
  title?: string;
  description?: string | null;
  realtor_id?: number;
  settlement_id?: number | null;  // deprecated, use location_id
  location_id?: number | null;    // NEW: иерархическая локация
  is_published?: boolean;
  is_featured?: boolean;
  title_auto?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  plot_ids?: number[];
  image_ids?: number[];
}

export async function getListings(filters: ListingFilters = {}): Promise<ListingListResponse> {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.cadastral_search) params.set("cadastral_search", filters.cadastral_search);
  if (filters.settlement_id) params.set("settlement_id", String(filters.settlement_id));
  if (filters.location_id) params.set("location_id", String(filters.location_id));
  if (filters.is_published !== undefined) params.set("is_published", String(filters.is_published));
  if (filters.is_featured !== undefined) params.set("is_featured", String(filters.is_featured));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.size) params.set("size", String(filters.size));

  const response = await fetchWithAuth(`/api/admin/listings/?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ошибка загрузки объявлений");
  }
  return response.json();
}

export async function getListing(id: number): Promise<ListingDetail> {
  const response = await fetchWithAuth(`/api/admin/listings/${id}`);
  if (!response.ok) {
    throw new Error("Объявление не найдено");
  }
  return response.json();
}

export async function createListing(data: ListingCreate): Promise<ListingDetail> {
  const response = await fetchWithAuth("/api/admin/listings/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка создания объявления");
  }
  return response.json();
}

export async function updateListing(id: number, data: ListingUpdate): Promise<ListingDetail> {
  const response = await fetchWithAuth(`/api/admin/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка обновления объявления");
  }
  return response.json();
}

export async function deleteListing(id: number): Promise<void> {
  const response = await fetchWithAuth(`/api/admin/listings/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Ошибка удаления объявления");
  }
}

export async function bulkDeleteListings(ids: number[]): Promise<{ deleted_count: number }> {
  const response = await fetchWithAuth("/api/admin/listings/bulk-delete/", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error("Ошибка массового удаления");
  }
  return response.json();
}

export async function searchPlots(query: string, listingId?: number): Promise<PlotShortItem[]> {
  const params = new URLSearchParams({ q: query });
  if (listingId) params.set("listing_id", String(listingId));

  const response = await fetchWithAuth(`/api/admin/listings/search-plots?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ошибка поиска участков");
  }
  return response.json();
}

// === Генерация скриншотов карты ===

export interface ScreenshotResponse {
  success: boolean;
  image_id: number | null;
  image_url: string | null;
  error: string | null;
}

export interface BulkScreenshotResponse {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  generated_image_ids: number[];
}

/**
 * Генерация скриншота карты для одного объявления.
 */
export async function generateListingScreenshot(listingId: number): Promise<ScreenshotResponse> {
  const response = await fetchWithAuth(`/api/admin/listings/${listingId}/generate-screenshot`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка генерации скриншота");
  }
  return response.json();
}

/**
 * Массовая генерация скриншотов для нескольких объявлений.
 */
export async function bulkGenerateScreenshots(
  listingIds: number[],
  onlyWithoutImages: boolean = true
): Promise<BulkScreenshotResponse> {
  const response = await fetchWithAuth("/api/admin/listings/bulk-generate-screenshots", {
    method: "POST",
    body: JSON.stringify({
      listing_ids: listingIds,
      only_without_images: onlyWithoutImages,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка массовой генерации скриншотов");
  }
  return response.json();
}

// === Справочники для форм ===

export async function getSettlements(): Promise<SettlementItem[]> {
  // Параметр all=true возвращает все населённые пункты, включая те, у которых нет объявлений
  const response = await fetch(`${API_URL}/api/locations/settlements/?all=true`);
  if (!response.ok) {
    throw new Error("Ошибка загрузки населённых пунктов");
  }
  return response.json();
}


export async function getRealtors(): Promise<RealtorItem[]> {
  const response = await fetchWithAuth("/api/admin/realtors/");
  if (!response.ok) {
    throw new Error("Ошибка загрузки риэлторов");
  }
  const data: RealtorsResponse = await response.json();
  return data.items;
}

export async function createRealtor(data: RealtorCreate): Promise<RealtorItem> {
  const response = await fetchWithAuth("/api/admin/realtors/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка создания риэлтора");
  }
  return response.json();
}

export async function updateRealtor(id: number, data: RealtorUpdate): Promise<RealtorItem> {
  const response = await fetchWithAuth(`/api/admin/realtors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка обновления риэлтора");
  }
  return response.json();
}

export async function deleteRealtor(id: number): Promise<void> {
  const response = await fetchWithAuth(`/api/admin/realtors/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка удаления риэлтора");
  }
}

export async function suggestSettlements(query: string): Promise<DaDataSuggestion[]> {
  const params = new URLSearchParams({ query });
  const response = await fetchWithAuth(`/api/admin/geo/suggest?${params.toString()}`);
  if (!response.ok) {
    console.error("Geo suggest error");
    return [];
  }
  const data: SuggestionResponse = await response.json();
  return data.suggestions;
}

export async function resolveSettlement(data: ResolveData): Promise<SettlementResolved> {
  const response = await fetchWithAuth("/api/admin/geo/resolve", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Ошибка сохранения населенного пункта");
  }
  return response.json();
}

// === Новый API для Location (иерархия) ===

export interface ResolveLocationData {
  name: string;
  settlement_type?: string | null;
  settlement_fias_id?: string | null;
  district_name?: string | null;
  district_fias_id?: string | null;
  city_name?: string | null;
  city_fias_id?: string | null;
}

export interface LocationResolved {
  location_id: number;
  name: string;
  full_name: string;
  path: string[];
}

export async function resolveLocation(data: ResolveLocationData): Promise<LocationResolved> {
  const response = await fetchWithAuth("/api/admin/geo/resolve-v2", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Ошибка сохранения локации");
  }
  return response.json();
}

export async function uploadImage(file: File): Promise<Image> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchWithAuth('/api/admin/images/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Ошибка загрузки изображения');
  }
  return response.json();
}

// === Карта участков ===

export interface PlotMapItem {
  id: number;
  cadastral_number: string | null;
  area: number | null;
  address: string | null;
  price_public: number | null;
  comment: string | null;
  status: "active" | "sold" | "reserved";
  listing_id: number | null;
  listing: { id: number; slug: string; title: string; is_published: boolean } | null;
  polygon_coords: [number, number][];  // [[lat, lon], ...]
}

export interface PlotClusterItem {
  center: [number, number];  // [lat, lon]
  count: number;
  unassigned_count: number;
  assigned_count: number;
  bounds: [[number, number], [number, number]];  // [[south, west], [north, east]]
}

export interface PlotMapResponse {
  items: PlotMapItem[];
  clusters: PlotClusterItem[];
  total: number;
  mode: "plots" | "clusters";
}

export interface ViewportParams {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export async function getPlotsForMap(viewport?: ViewportParams): Promise<PlotMapResponse> {
  let url = "/api/admin/plots/map";

  if (viewport) {
    const params = new URLSearchParams();
    params.set("north", String(viewport.north));
    params.set("south", String(viewport.south));
    params.set("east", String(viewport.east));
    params.set("west", String(viewport.west));
    params.set("zoom", String(viewport.zoom));
    url += `?${params.toString()}`;
  }

  const response = await fetchWithAuth(url);
  if (!response.ok) {
    throw new Error("Ошибка загрузки участков для карты");
  }
  return response.json();
}


export async function bulkAssignPlots(
  plotIds: number[],
  listingId: number
): Promise<{ updated_count: number }> {
  const response = await fetchWithAuth("/api/admin/plots/bulk-assign", {
    method: "POST",
    body: JSON.stringify({ plot_ids: plotIds, listing_id: listingId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка привязки участков");
  }
  return response.json();
}

// === Массовый импорт участков ===

export interface BulkImportItem {
  cadastral_number: string;
  price?: number | null;
  comment?: string | null;
}

export interface BulkImportResultItem {
  cadastral_number: string;
  plot_id?: number | null;
  status: "created" | "updated" | "error";
  message?: string | null;
  nspd_status?: string | null;
}

export interface BulkImportResponse {
  total: number;
  created: number;
  updated: number;
  errors: number;
  items: BulkImportResultItem[];
}

export async function bulkImportPlots(items: BulkImportItem[]): Promise<BulkImportResponse> {
  const response = await fetchWithAuth("/api/admin/plots/bulk-import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Ошибка при массовом импорте");
  }

  return response.json();
}

export type StreamEvent =
  | { type: "start"; total: number }
  | { type: "processing"; current: number; total: number; cadastral_number: string }
  | { type: "progress"; current: number; total: number; item: BulkImportResultItem }
  | { type: "finish"; summary: BulkImportResponse };

export async function bulkImportPlotsStream(
  items: BulkImportItem[],
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const response = await fetchWithAuth("/api/admin/plots/bulk-import/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Ошибка при массовом импорте");
  }

  if (!response.body) {
    throw new Error("Нет тела ответа");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");

    // Последняя часть может быть неполной
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as StreamEvent;
          onEvent(event);
        } catch (e) {
          console.error("Ошибка парсинга события стрима:", e, line);
        }
      }
    }
  }
}

export interface BulkUpdateRequest {
  plot_ids: number[];
  land_use_id?: number | null;
  land_category_id?: number | null;
  price_public?: number | null;
}

export async function bulkUpdatePlots(
  data: BulkUpdateRequest
): Promise<{ updated_count: number }> {
  const response = await fetchWithAuth("/api/admin/plots/bulk-update", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка массового обновления");
  }
  return response.json();
}

// === Аутентификация ===

export async function forgotPassword(email: string): Promise<{ detail: string }> {
  const response = await fetch(`${API_URL}/api/auth/forgot-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка при запросе сброса пароля");
  }
  return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ detail: string }> {
  const response = await fetch(`${API_URL}/api/auth/reset-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Ошибка при смене пароля");
  }
  return response.json();
}

// === Заявки (Leads) ===

export interface LeadItem {
  id: number;
  name: string | null;
  phone: string;
  comment: string | null;
  status: "new" | "processing" | "completed" | "rejected";
  source_url: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsResponse {
  items: LeadItem[];
  total: number;
  page: number;
  size: number;
}

export async function getLeads(page = 1, size = 20, status?: string): Promise<LeadsResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);

  const response = await fetchWithAuth(`/api/admin/leads/admin?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ошибка загрузки заявок");
  }
  return response.json();
}

export async function updateLeadStatus(id: number, status: string): Promise<LeadItem> {
  const response = await fetchWithAuth(`/api/admin/leads/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error("Ошибка обновления статуса заявки");
  }
  return response.json();
}

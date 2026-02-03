/**
 * Утилиты для построения гео-зависимых URL.
 * 
 * Структура URL:
 * - /catalog — все участки
 * - /{district_slug} — район
 * - /{district_slug}/{settlement_slug} — район + населённый пункт
 * - /{district_slug}/{settlement_slug}/{listing_slug} — листинг
 * - /listing/{slug} — листинг без географии (fallback)
 */

// === Типы (старые — для обратной совместимости) ===

export interface GeoLocation {
    districtId?: number;
    districtSlug?: string;
    districtName?: string;
    settlementId?: number;
    settlementSlug?: string;
    settlementName?: string;
    settlementType?: string; // "г", "пос", "с"
}

// === Типы (новые — иерархическая архитектура) ===

export type LocationType = "region" | "district" | "city" | "settlement";

/** Элемент иерархии локаций */
export interface HierarchyLocation {
    id: number;
    name: string;
    slug: string;
    type: LocationType;
    settlement_type?: string | null; // "г", "пос", "с"
    listings_count: number;
    children: HierarchyLocation[];
}

/** Выбранная локация в фильтре */
export interface SelectedLocation {
    id: number;
    name: string;
    slug: string;
    type: LocationType;
    parentId?: number;
}

/** Результат резолва цепочки слагов */
export interface ResolvedLocationChain {
    locations: {
        id: number;
        name: string;
        slug: string;
        type: LocationType;
        settlement_type?: string | null;
    }[];
    leaf_id: number | null;
}

export interface FilterParams {
    settlements?: number[];
    landUse?: string;
    priceMin?: string;
    priceMax?: string;
    areaMin?: string;
    areaMax?: string;
    sort?: string;
    page?: number;
}

export interface ListingGeoInfo {
    slug: string;
    districtSlug?: string;
    settlementSlug?: string;
}

// === Построение URL для каталога ===

/**
 * Строит URL каталога на основе выбранных фильтров.
 * 
 * Логика:
 * - Несколько районов или н.п. из разных районов → /catalog?...
 * - Один район без н.п. → /{district_slug}
 * - Один район + один н.п. → /{district_slug}/{settlement_slug}
 * - Один район + несколько н.п. → /{district_slug}?settlements=...
 * - Без фильтров → /catalog
 */
export function buildCatalogUrl(
    geo: GeoLocation,
    filters: FilterParams,
    settlementSlugs?: string[], // slug'и всех выбранных населённых пунктов
): string {
    const params = new URLSearchParams();

    // Добавляем не-гео фильтры
    if (filters.landUse) params.set("land_use", filters.landUse);
    if (filters.priceMin) params.set("price_min", filters.priceMin);
    if (filters.priceMax) params.set("price_max", filters.priceMax);
    if (filters.areaMin) params.set("area_min", filters.areaMin);
    if (filters.areaMax) params.set("area_max", filters.areaMax);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.page && filters.page > 1) params.set("page", filters.page.toString());

    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : "";

    // Логика определения базового пути
    const settlements = filters.settlements || [];

    // Если есть несколько населённых пунктов и все в одном районе
    if (settlements.length > 1 && geo.districtSlug && settlementSlugs) {
        // /{district_slug}?settlements=slug1,slug2
        params.set("settlements", settlementSlugs.join(","));
        return `/${geo.districtSlug}?${params.toString()}`;
    }

    // Один район + один населённый пункт
    if (geo.districtSlug && geo.settlementSlug) {
        return `/${geo.districtSlug}/${geo.settlementSlug}${suffix}`;
    }

    // Только район
    if (geo.districtSlug) {
        return `/${geo.districtSlug}${suffix}`;
    }

    // Fallback — каталог с query-параметрами
    if (settlements.length > 0) {
        params.set("settlements", settlements.join(","));
    }

    const finalQuery = params.toString();
    return finalQuery ? `/catalog?${finalQuery}` : "/catalog";
}

// === Построение URL для листинга ===

/**
 * Строит URL страницы листинга.
 * 
 * - С географией: /{district_slug}/{settlement_slug}/{listing_slug}
 * - Без географии: /listing/{slug}
 */
export function buildListingUrl(listing: ListingGeoInfo): string {
    if (listing.districtSlug && listing.settlementSlug) {
        return `/${listing.districtSlug}/${listing.settlementSlug}/${listing.slug}`;
    }
    if (listing.districtSlug) {
        return `/${listing.districtSlug}/${listing.slug}`;
    }
    return `/listing/${listing.slug}`;
}

// === Парсинг гео-URL ===

export type GeoUrlType = "catalog" | "catalog-district" | "catalog-settlement" | "listing" | "unknown";

export interface ParsedGeoUrl {
    type: GeoUrlType;
    districtSlug?: string;
    settlementSlug?: string;
    listingSlug?: string;
}

/**
 * Парсит гео-сегменты URL.
 * 
 * Примеры:
 * - [] → catalog
 * - ["gvardeyskiy"] → catalog-district
 * - ["gvardeyskiy", "kurgan"] → catalog-settlement ИЛИ listing (нужен бэкенд для определения)
 * - ["gvardeyskiy", "kurgan", "prodazha-uchastka-5"] → listing
 */
export function parseGeoUrl(segments: string[]): ParsedGeoUrl {
    if (segments.length === 0) {
        return { type: "catalog" };
    }

    if (segments.length === 1) {
        return {
            type: "catalog-district",
            districtSlug: segments[0],
        };
    }

    if (segments.length === 2) {
        // Может быть либо catalog-settlement, либо listing
        // Определяем по контексту (бэкенд вернёт 404 для неправильного типа)
        return {
            type: "unknown", // Нужен запрос к API для определения
            districtSlug: segments[0],
            settlementSlug: segments[1], // или listingSlug
        };
    }

    if (segments.length === 3) {
        return {
            type: "listing",
            districtSlug: segments[0],
            settlementSlug: segments[1],
            listingSlug: segments[2],
        };
    }

    return { type: "unknown" };
}

// === Breadcrumbs ===

export interface BreadcrumbItem {
    name: string;
    href: string;
}

/**
 * Строит breadcrumbs для гео-страниц.
 */
export function buildGeoBreadcrumbs(
    geo: GeoLocation,
    listingTitle?: string,
    listingSlug?: string,
): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];

    // Район
    if (geo.districtSlug && geo.districtName) {
        items.push({
            name: geo.districtName,
            href: `/${geo.districtSlug}`,
        });
    }

    // Населённый пункт
    if (geo.settlementSlug && geo.settlementName && geo.districtSlug) {
        const typePrefix = geo.settlementType ? `${geo.settlementType}. ` : "";
        items.push({
            name: `${typePrefix}${geo.settlementName}`,
            href: `/${geo.districtSlug}/${geo.settlementSlug}`,
        });
    }

    // Листинг
    if (listingTitle && listingSlug && geo.districtSlug) {
        const href = geo.settlementSlug
            ? `/${geo.districtSlug}/${geo.settlementSlug}/${listingSlug}`
            : `/${geo.districtSlug}/${listingSlug}`;
        items.push({
            name: listingTitle,
            href,
        });
    }

    return items;
}

// === Форматирование названия населённого пункта ===

/**
 * Форматирует название с типом: "г. Калининград", "пос. Янтарный"
 */
export function formatSettlementName(name: string, type?: string | null): string {
    if (!type) return name;
    return `${type}. ${name}`;
}

// === Утилиты для новой иерархии ===

/**
 * Строит URL на основе выбранных локаций из иерархии.
 * 
 * Логика:
 * - Одна локация → /slug (район или город)
 * - Две (parent + child) → /parent-slug/child-slug
 * - Несколько несвязанных → /catalog?location_ids=1,2,3
 */
export function buildHierarchyUrl(
    selectedLocations: SelectedLocation[],
    filters: FilterParams,
): string {
    const params = new URLSearchParams();

    // Добавляем не-гео фильтры
    if (filters.landUse) params.set("land_use", filters.landUse);
    if (filters.priceMin) params.set("price_min", filters.priceMin);
    if (filters.priceMax) params.set("price_max", filters.priceMax);
    if (filters.areaMin) params.set("area_min", filters.areaMin);
    if (filters.areaMax) params.set("area_max", filters.areaMax);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.page && filters.page > 1) params.set("page", filters.page.toString());

    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : "";

    if (selectedLocations.length === 0) {
        return `/catalog${suffix}`;
    }

    // Одна локация — простой путь
    if (selectedLocations.length === 1) {
        return `/${selectedLocations[0].slug}${suffix}`;
    }

    // Две локации в иерархии (parent -> child)
    if (selectedLocations.length === 2) {
        const [first, second] = selectedLocations;
        // Проверяем, является ли second дочерним элементом first
        if (second.parentId === first.id) {
            return `/${first.slug}/${second.slug}${suffix}`;
        }
        // Или наоборот
        if (first.parentId === second.id) {
            return `/${second.slug}/${first.slug}${suffix}`;
        }
    }

    // Несколько несвязанных локаций — используем query params
    const ids = selectedLocations.map(l => l.id).join(",");
    params.set("location_ids", ids);
    return `/catalog?${params.toString()}`;
}

/**
 * Находит локацию по ID в дереве.
 */
export function findLocationById(
    tree: HierarchyLocation[],
    id: number,
): HierarchyLocation | null {
    for (const node of tree) {
        if (node.id === id) return node;
        if (node.children.length > 0) {
            const found = findLocationById(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Находит локацию по slug в дереве.
 */
export function findLocationBySlug(
    tree: HierarchyLocation[],
    slug: string,
): HierarchyLocation | null {
    for (const node of tree) {
        if (node.slug === slug) return node;
        if (node.children.length > 0) {
            const found = findLocationBySlug(node.children, slug);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Получает путь от корня до указанной локации.
 */
export function getLocationPath(
    tree: HierarchyLocation[],
    targetId: number,
    path: HierarchyLocation[] = [],
): HierarchyLocation[] | null {
    for (const node of tree) {
        const newPath = [...path, node];
        if (node.id === targetId) return newPath;
        if (node.children.length > 0) {
            const found = getLocationPath(node.children, targetId, newPath);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Собирает все ID потомков локации (включая её саму).
 */
export function getAllDescendantIds(location: HierarchyLocation): number[] {
    const ids = [location.id];
    for (const child of location.children) {
        ids.push(...getAllDescendantIds(child));
    }
    return ids;
}

/**
 * Строит breadcrumbs для иерархии локаций.
 */
export function buildHierarchyBreadcrumbs(
    locationPath: HierarchyLocation[],
    listingTitle?: string,
    listingSlug?: string,
): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    let currentPath = "";

    // Пропускаем регион (первый элемент), показываем с района/города
    const pathWithoutRegion = locationPath.filter(l => l.type !== "region");

    for (const loc of pathWithoutRegion) {
        currentPath += `/${loc.slug}`;
        const typePrefix = loc.settlement_type ? `${loc.settlement_type}. ` : "";
        items.push({
            name: `${typePrefix}${loc.name}`,
            href: currentPath,
        });
    }

    // Листинг
    if (listingTitle && listingSlug) {
        items.push({
            name: listingTitle,
            href: `${currentPath}/${listingSlug}`,
        });
    }

    return items;
}

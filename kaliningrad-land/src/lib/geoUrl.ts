/**
 * Утилиты для построения гео-зависимых URL.
 * 
 * Структура URL:
 * - /catalog — все участки
 * - /{district_slug} — район
 * - /{district_slug}/{settlement_slug} — район + населённый пункт
 * - /{district_slug}/{settlement_slug}/{listing_slug} — листинг
 */


// === Типы (новая — иерархическая архитектура) ===

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
    location?: {
        slug: string;
        type: string;
        parent?: {
            slug: string;
        } | null;
    } | null;
}



// === Построение URL для листинга ===

/**
 * Строит URL страницы листинга.
 * 
 * - С географией: /{location_slug}/{listing_slug} или /{parent_slug}/{location_slug}/{listing_slug}
 * 
 * @throws Error если у листинга нет привязанной локации
 */
export function buildListingUrl(listing: ListingGeoInfo): string {
    if (!listing.location) {
        // Локация обязательна для формирования URL
        throw new Error(`Listing "${listing.slug}" не имеет привязанной локации. Невозможно построить URL.`);
    }

    // Если тип settlement - добавляем родителя (район)
    // Для city и district родитель не выводится в URL (они верхнеуровневые, либо parent=region)
    if (listing.location.type === 'settlement' && listing.location.parent?.slug) {
        return `/${listing.location.parent.slug}/${listing.location.slug}/${listing.slug}`;
    }
    return `/${listing.location.slug}/${listing.slug}`;
}


// === Построение geo-URL для локации (canonical) ===

export interface LocationGeoInfo {
    slug: string;
    type: string;
    parent?: { slug: string } | null;
}

/**
 * Строит geo-URL для локации (используется для canonical в каталоге).
 * 
 * - City/District: /{slug}
 * - Settlement: /{parent_slug}/{slug}
 */
export function buildLocationUrlForCanonical(location: LocationGeoInfo): string {
    // Settlement — нужен parent (район)
    if (location.type === 'settlement' && location.parent?.slug) {
        return `/${location.parent.slug}/${location.slug}`;
    }
    // City или District — верхнеуровневые
    return `/${location.slug}`;
}


// === Парсинг гео-URL ===

export type GeoUrlType = "catalog" | "catalog-location" | "listing" | "unknown";

export interface ParsedGeoUrl {
    type: GeoUrlType;
    slugs: string[];          // Все гео-сегменты (локации)
    listingSlug?: string;     // Slug листинга (если есть)
}

/**
 * Парсит гео-сегменты URL.
 * 
 * Примеры:
 * - [] → catalog, slugs=[]
 * - ["pionerskij"] → catalog-location, slugs=["pionerskij"]
 * - ["guryevskiy-r-n", "poddubnoe"] → catalog-location, slugs=["guryevskiy-r-n", "poddubnoe"]
 * - ["guryevskiy-r-n", "poddubnoe", "prodazha-uchastka-5"] → listing
 * - ["pionerskij", "prodazha-uchastka-5"] → может быть listing (нужен API)
 */
export function parseGeoUrl(segments: string[]): ParsedGeoUrl {
    if (segments.length === 0) {
        return { type: "catalog", slugs: [] };
    }

    if (segments.length === 1) {
        // Один сегмент — локация (district или city)
        return {
            type: "catalog-location",
            slugs: [segments[0]],
        };
    }

    if (segments.length === 2) {
        // Два сегмента — либо parent+child локация, либо location+listing
        // Определяется на уровне page.tsx через API
        return {
            type: "unknown",
            slugs: [segments[0]],
            listingSlug: segments[1], // Может оказаться child-локацией
        };
    }

    if (segments.length === 3) {
        // Три сегмента — точно parent + child + listing
        return {
            type: "listing",
            slugs: [segments[0], segments[1]],
            listingSlug: segments[2],
        };
    }

    return { type: "unknown", slugs: segments };
}


// === Breadcrumbs ===

export interface BreadcrumbItem {
    name: string;
    href: string;
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

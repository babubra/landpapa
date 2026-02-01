/**
 * Утилита для построения SEO-дружественных гео-URL для каталога.
 */

export interface SelectedLocation {
    settlementId: number;
    settlementSlug: string;
    districtId: number;
    districtSlug: string;
}

export interface CatalogFilterParams {
    landUse?: string;
    priceMin?: string;
    priceMax?: string;
    areaMin?: string;
    areaMax?: string;
    sort?: string;
}

/**
 * Строит SEO-дружественный URL для каталога.
 * 
 * Логика:
 * - 0 н.п. → /catalog
 * - 1 н.п. → /{district_slug}/{settlement_slug}
 * - N н.п. из 1 района → /{district_slug}?settlements=slug1,slug2
 * - N н.п. из разных районов → /catalog?settlements=slug1,slug2
 */
export function buildCatalogGeoUrl(
    locations: SelectedLocation[],
    filters: CatalogFilterParams
): string {
    const params = new URLSearchParams();

    // Добавляем не-гео фильтры
    if (filters.landUse) params.set("land_use", filters.landUse);
    if (filters.priceMin) params.set("price_min", filters.priceMin);
    if (filters.priceMax) params.set("price_max", filters.priceMax);
    if (filters.areaMin) params.set("area_min", filters.areaMin);
    if (filters.areaMax) params.set("area_max", filters.areaMax);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

    const query = params.toString();
    const suffix = query ? `?${query}` : "";

    // Без выбора → /catalog
    if (locations.length === 0) {
        return `/catalog${suffix}`;
    }

    // Один н.п. → /{district}/{settlement}
    if (locations.length === 1) {
        const { districtSlug, settlementSlug } = locations[0];
        return `/${districtSlug}/${settlementSlug}${suffix}`;
    }

    // Несколько н.п. — определяем, из одного ли района
    const districts = new Set(locations.map(l => l.districtSlug));
    const slugs = locations.map(l => l.settlementSlug).join(",");
    params.set("settlements", slugs);

    // Один район → /{district}?settlements=slug1,slug2
    if (districts.size === 1) {
        return `/${locations[0].districtSlug}?${params.toString()}`;
    }

    // Несколько районов → /catalog?settlements=slug1,slug2
    return `/catalog?${params.toString()}`;
}

"use client";

import { useState, useEffect } from "react";

/**
 * Хук для определения мобильного устройства.
 * @param breakpoint - точка перелома в пикселях (по умолчанию 768)
 * @returns true если ширина экрана меньше breakpoint
 */
export function useIsMobile(breakpoint: number = 768): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Проверяем при монтировании
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        checkIsMobile();

        // Слушаем изменение размера окна
        window.addEventListener("resize", checkIsMobile);
        return () => window.removeEventListener("resize", checkIsMobile);
    }, [breakpoint]);

    return isMobile;
}

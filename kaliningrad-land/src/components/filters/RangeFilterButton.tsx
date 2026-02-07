"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RangeFilterButtonProps {
    /** Текст кнопки (Цена, Площадь) */
    label: string;
    /** Минимальное значение */
    minValue: string;
    /** Максимальное значение */
    maxValue: string;
    /** Обработчик изменения минимального значения */
    onMinChange: (value: string) => void;
    /** Обработчик изменения максимального значения */
    onMaxChange: (value: string) => void;
    /** Единица измерения для отображения ("₽", "сот.") */
    unit: string;
    /** Вызывается при закрытии popup (для применения фильтров) */
    onClose?: () => void;
    /** Дополнительные классы */
    className?: string;
}

/**
 * Кнопка фильтра с popup для ввода диапазона "от" - "до".
 * При клике открывается popup с двумя инпутами и суффиксами единиц измерения.
 */
export function RangeFilterButton({
    label,
    minValue,
    maxValue,
    onMinChange,
    onMaxChange,
    unit,
    onClose,
    className,
}: RangeFilterButtonProps) {
    const [open, setOpen] = useState(false);

    // Формируем текст для кнопки на основе выбранных значений
    const getButtonText = useCallback(() => {
        const hasMin = minValue && minValue.trim() !== "";
        const hasMax = maxValue && maxValue.trim() !== "";

        if (hasMin && hasMax) {
            return `${formatNumber(minValue)} — ${formatNumber(maxValue)} ${unit}`;
        }
        if (hasMin) {
            return `от ${formatNumber(minValue)} ${unit}`;
        }
        if (hasMax) {
            return `до ${formatNumber(maxValue)} ${unit}`;
        }
        return label;
    }, [label, minValue, maxValue, unit]);

    // Форматирование числа с разделителями тысяч
    const formatNumber = (value: string): string => {
        const num = parseInt(value, 10);
        if (isNaN(num)) return value;
        return num.toLocaleString("ru-RU");
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        // При закрытии вызываем callback для применения фильтров
        if (!isOpen && onClose) {
            onClose();
        }
    };

    const hasValue = minValue || maxValue;
    const buttonText = getButtonText();

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-9 justify-between gap-1 font-normal",
                        hasValue && "bg-primary/10 border-primary/50",
                        className
                    )}
                >
                    <span className={cn(hasValue && "font-medium")}>
                        {buttonText}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
                <div className="flex items-center gap-2">
                    {/* Input "от" */}
                    <div className="relative">
                        <Input
                            type="number"
                            placeholder="от"
                            value={minValue}
                            onChange={(e) => onMinChange(e.target.value)}
                            className="h-9 w-28 pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                            {unit}
                        </span>
                    </div>

                    {/* Input "до" */}
                    <div className="relative">
                        <Input
                            type="number"
                            placeholder="до"
                            value={maxValue}
                            onChange={(e) => onMaxChange(e.target.value)}
                            className="h-9 w-28 pr-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                            {unit}
                        </span>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

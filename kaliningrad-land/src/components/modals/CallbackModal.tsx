"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEAD_SUCCESS_HASH, trackHashPageview } from "@/lib/landing";

const formSchema = z.object({
    name: z.string().min(2, "Имя должно быть не менее 2 символов"),
    phone: z.string().min(10, "Введите корректный номер телефона"),
    // Ловушка для ботов: скрытый чекбокс (автозаполнение браузера чекбоксы не трогает)
    subscribe_updates: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CallbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
}

export function CallbackModal({
    open,
    onOpenChange,
    title = "Подберите мне участок",
    description = "Оставьте свои контакты, и наш менеджер перезвонит вам в ближайшее время."
}: CallbackModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    // Время открытия формы: мгновенная отправка выдаёт бота
    const openedAt = useRef(0);

    useEffect(() => {
        if (open) {
            openedAt.current = Date.now();
        }
    }, [open]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/leads/public/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...data,
                    form_time_ms: Date.now() - openedAt.current,
                }),
            });

            if (!response.ok) {
                throw new Error("Ошибка при отправке заявки");
            }

            setIsSuccess(true);
            reset();

            // Экран «Заявка принята» — отдельная «страница»: адрес меняется на #zayavka-prinyata,
            // и этот просмотр уходит в Метрику, чтобы по нему настраивалась цель
            window.history.replaceState(null, "", LEAD_SUCCESS_HASH);
            trackHashPageview(LEAD_SUCCESS_HASH, "Заявка принята");

            // Закрываем через 2 секунды после успеха
            setTimeout(() => {
                onOpenChange(false);
                setIsSuccess(false);
            }, 3000);
        } catch (error) {
            console.error("Error submitting lead:", error);
            alert("Произошла ошибка. Пожалуйста, попробуйте позже.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isSuccess ? "Заявка принята!" : title}</DialogTitle>
                    <DialogDescription>
                        {isSuccess
                            ? "Спасибо! Мы свяжемся с вами очень быстро."
                            : description}
                    </DialogDescription>
                </DialogHeader>

                {!isSuccess && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        {/* Ловушка для ботов: скрытый чекбокс. Текстовые поля здесь стояли раньше,
                            но автозаполнение браузера заполняло их вместе с именем и телефоном,
                            и заявка живого человека отбрасывалась как спам. Чекбоксы оно не трогает */}
                        <div className="sr-only" aria-hidden="true">
                            <input
                                type="checkbox"
                                {...register("subscribe_updates")}
                                tabIndex={-1}
                                autoComplete="off"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Ваше имя</Label>
                            <Input
                                id="name"
                                placeholder="Иван Иванов"
                                {...register("name")}
                                className={errors.name ? "border-destructive" : ""}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Телефон</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+7 (___) ___-__-__"
                                {...register("phone")}
                                className={errors.phone ? "border-destructive" : ""}
                            />
                            {errors.phone && (
                                <p className="text-sm text-destructive">{errors.phone.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Отправка..." : "Отправить заявку"}
                        </Button>

                        <p className="text-[10px] text-muted-foreground text-center leading-tight">
                            Нажимая кнопку «Отправить заявку», вы соглашаетесь с{" "}
                            <Link href="/privacy" className="underline hover:text-primary">
                                политикой конфиденциальности
                            </Link>{" "}
                            и даете согласие на обработку персональных данных.
                        </p>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

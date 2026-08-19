"use client";

import { useState } from "react";
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
    // Honeypot fields
    subject_line: z.string().optional(),
    reference_code: z.string().optional(),
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
                body: JSON.stringify(data),
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
                        {/* Honeypot: поля-ловушки для ботов. Названия не похожи на имя/почту,
                            иначе их заполняет автозаполнение браузера и заявка живого человека
                            отбрасывается как спам */}
                        <div className="sr-only" aria-hidden="true">
                            <Input {...register("subject_line")} tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore />
                            <Input {...register("reference_code")} tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore />
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

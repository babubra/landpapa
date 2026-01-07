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
import { API_URL } from "@/lib/config";

const formSchema = z.object({
    name: z.string().min(2, "Имя должно быть не менее 2 символов"),
    phone: z.string().min(10, "Введите корректный номер телефона"),
    // Honeypot fields
    email_confirm: z.string().optional(),
    last_name: z.string().optional(),
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
            const response = await fetch(`${API_URL}/api/leads/public`, {
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
                        {/* Honeypot fields - hidden from users */}
                        <div className="sr-only" aria-hidden="true">
                            <Input {...register("email_confirm")} tabIndex={-1} autoComplete="off" />
                            <Input {...register("last_name")} tabIndex={-1} autoComplete="off" />
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

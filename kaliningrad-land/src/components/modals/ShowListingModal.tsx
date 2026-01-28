"use client";

import { useState } from "react";
import Image from "next/image";
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

const formSchema = z.object({
    name: z.string().min(2, "Имя должно быть не менее 2 символов"),
    phone: z.string().min(10, "Введите корректный номер телефона"),
    // Дополнительное поле для контекста заявки
    message: z.string().optional(),
    // Honeypot fields
    email_confirm: z.string().optional(),
    last_name: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ShowListingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lotInfo?: string; // Кадастровый номер или ID участка для контекста
}

export function ShowListingModal({
    open,
    onOpenChange,
    lotInfo = ""
}: ShowListingModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: lotInfo ? `Хочу посмотреть участок: ${lotInfo}` : "Хочу посмотреть участок",
        }
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
            // Закрываем через 3 секунды после успеха
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
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden flex flex-col md:flex-row gap-0">

                {/* Левая колонка - Изображение */}
                <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-muted">
                    <Image
                        src="/images/cadastral-showing.png"
                        alt="Кадастровый инженер показывает участок"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-6">
                        <div className="text-white">
                            <h3 className="font-bold text-xl mb-1">Показ участка на местности</h3>
                            <p className="text-sm text-white/90">
                                Наш специалист подъедет в удобное время, покажет границы участка и ответит на технические вопросы.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Правая колонка - Форма */}
                <div className="w-full md:w-1/2 p-6 flex flex-col justify-center">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl">
                            {isSuccess ? "Заявка принята!" : "Записаться на просмотр"}
                        </DialogTitle>
                        <DialogDescription>
                            {isSuccess
                                ? "Спасибо! Менеджер свяжется с вами для согласования времени."
                                : "Оставьте телефон, мы перезвоним и договоримся о встрече."}
                        </DialogDescription>
                    </DialogHeader>

                    {!isSuccess && (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Honeypot fields - hidden from users */}
                            <div className="sr-only" aria-hidden="true">
                                <Input {...register("email_confirm")} tabIndex={-1} autoComplete="off" />
                                <Input {...register("last_name")} tabIndex={-1} autoComplete="off" />
                                <Input {...register("message")} className="hidden" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="show-name">Ваше имя</Label>
                                <Input
                                    id="show-name"
                                    placeholder="Иван"
                                    {...register("name")}
                                    className={errors.name ? "border-destructive" : ""}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="show-phone">Телефон</Label>
                                <Input
                                    id="show-phone"
                                    type="tel"
                                    placeholder="+7 (999) 000-00-00"
                                    {...register("phone")}
                                    className={errors.phone ? "border-destructive" : ""}
                                />
                                {errors.phone && (
                                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Отправка..." : "Договориться о просмотре"}
                            </Button>

                            <p className="text-[10px] text-muted-foreground text-center leading-tight pt-2">
                                Нажимая кнопку, вы соглашаетесь с{" "}
                                <Link href="/contacts" className="underline hover:text-primary">
                                    политикой конфиденциальности
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

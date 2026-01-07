import { FileCheck, Users, Banknote, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function MaternityCapitalSection() {
    return (
        <section className="pt-6">
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8 lg:p-10">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                    {/* Текст слева */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="h-8 w-8 text-primary" />
                            <span className="text-sm font-medium text-primary uppercase tracking-wide">
                                Многодетным семьям
                            </span>
                        </div>

                        <h2 className="mb-4 text-2xl md:text-3xl font-bold">
                            Покупайте участок по программе для многодетных семей
                        </h2>

                        <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                            В Калининградской области многодетные семьи могут получить денежную выплату вместо предоставления земельного участка.
                        </p>

                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <FileCheck className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-foreground">У нас можно выбрать и купить земельный участок с использованием этой выплаты</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Handshake className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-foreground">Поможем подобрать вариант и оформить сделку под программу</span>
                            </li>
                        </ul>
                    </div>

                    {/* Декоративный блок справа */}
                    <div className="hidden lg:flex items-center justify-center">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl" />
                            <div className="relative bg-card rounded-2xl border p-8 shadow-lg">
                                <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                                <p className="text-center text-lg font-semibold whitespace-nowrap">
                                    Региональная выплата для семей
                                </p>
                                <p className="text-center text-3xl font-bold text-primary mt-2">
                                    ₽ 400 000
                                </p>
                                <p className="text-center text-sm text-muted-foreground mt-1">
                                    вместо участка
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

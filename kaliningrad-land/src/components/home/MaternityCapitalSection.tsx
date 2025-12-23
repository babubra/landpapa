import { FileCheck, Baby, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MaternityCapitalSection() {
    return (
        <section className="pt-6">
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-10 lg:p-12">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                    {/* Текст слева */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Baby className="h-8 w-8 text-primary" />
                            <span className="text-sm font-medium text-primary uppercase tracking-wide">
                                Материнский капитал
                            </span>
                        </div>

                        <h2 className="mb-4 text-2xl md:text-3xl">
                            Приобретайте участок с использованием материнского капитала
                        </h2>

                        <p className="text-muted-foreground mb-6">
                            Мы предоставляем возможность оплаты земельного участка
                            средствами материнского (семейного) капитала.
                            Поможем с оформлением всех необходимых документов.
                        </p>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start gap-3">
                                <FileCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span>Полное сопровождение сделки с использованием сертификата</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Banknote className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span>Возможность комбинирования с ипотекой или собственными средствами</span>
                            </li>
                        </ul>

                        <Button size="lg">
                            Узнать подробнее
                        </Button>
                    </div>

                    {/* Декоративный блок справа */}
                    <div className="hidden lg:flex items-center justify-center">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl" />
                            <div className="relative bg-card rounded-2xl border p-8 shadow-lg">
                                <Baby className="h-16 w-16 text-primary mx-auto mb-4" />
                                <p className="text-center text-lg font-semibold">
                                    Материнский капитал
                                </p>
                                <p className="text-center text-3xl font-bold text-primary mt-2">
                                    ₽ 833 025
                                </p>
                                <p className="text-center text-sm text-muted-foreground mt-1">
                                    размер в 2024 году
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

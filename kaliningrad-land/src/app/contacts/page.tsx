import { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { getSiteSettings } from "@/lib/server-config";
import { SITE_URL } from "@/lib/config";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SeoJsonLd } from "@/components/seo/SeoJsonLd";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();

    const title = settings.seo_contacts_title || "Контакты";
    const description = settings.seo_contacts_description ||
        "Свяжитесь с нами — телефон, email, адрес офиса. РКК земля — продажа земельных участков в Калининградской области.";

    return {
        title,
        description,
        alternates: {
            canonical: "/contacts",
        },
        openGraph: {
            type: "website",
            url: "/contacts",
            title,
            description,
            images: settings.og_image ? [{ url: settings.og_image }] : undefined,
        },
    };
}

export default async function ContactsPage() {
    const settings = await getSiteSettings();

    // JSON-LD для LocalBusiness
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": settings.site_name || "РКК земля",
        "url": SITE_URL,
        "telephone": settings.site_phone,
        "email": settings.site_email,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": settings.site_address,
            "addressLocality": "Калининград",
            "addressRegion": "Калининградская область",
            "postalCode": "236000",
            "addressCountry": "RU"
        },
    };

    const contactItems = [
        {
            icon: Phone,
            label: "Телефон",
            value: settings.site_phone,
            href: settings.site_phone ? `tel:${settings.site_phone.replace(/\D/g, "")}` : undefined,
        },
        {
            icon: Mail,
            label: "Email",
            value: settings.site_email,
            href: settings.site_email ? `mailto:${settings.site_email}` : undefined,
        },
        {
            icon: MapPin,
            label: "Адрес",
            value: settings.site_address,
        },
        {
            icon: Clock,
            label: "Режим работы",
            value: [settings.site_work_hours_weekdays, settings.site_work_hours_weekend]
                .filter(Boolean)
                .join(" / "),
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <SeoJsonLd data={jsonLd} />
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Breadcrumbs items={[
                    { name: "Контакты", href: "/contacts" }
                ]} />

                <h1 className="text-3xl font-bold mb-8">Контакты</h1>

                {/* Контактная информация */}
                <div className="bg-card border rounded-2xl p-6 mb-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                        {contactItems.map((item, index) => (
                            item.value && (
                                <div key={index} className="flex items-start gap-4">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <item.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{item.label}</p>
                                        {item.href ? (
                                            <a
                                                href={item.href}
                                                className="font-medium hover:text-primary transition-colors"
                                            >
                                                {item.value}
                                            </a>
                                        ) : (
                                            <p className="font-medium">{item.value}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Описание из админки */}
                {settings.contacts_page && (
                    <div
                        className="prose prose-slate dark:prose-invert max-w-none mb-6
                                   prose-headings:text-foreground prose-headings:font-semibold
                                   prose-p:text-muted-foreground prose-p:leading-relaxed
                                   prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                        dangerouslySetInnerHTML={{ __html: settings.contacts_page }}
                    />
                )}

                {/* Яндекс.Карта */}
                {settings.contacts_map_iframe && (
                    <div className="rounded-2xl overflow-hidden border">
                        <div
                            className="[&_iframe]:w-full [&_iframe]:h-[400px] [&_iframe]:block"
                            dangerouslySetInnerHTML={{ __html: settings.contacts_map_iframe }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

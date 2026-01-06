import Script from "next/script";

type SeoJsonLdProps = {
    data: Record<string, any>;
};

export function SeoJsonLd({ data }: SeoJsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

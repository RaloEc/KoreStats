import { getServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ClientPatchPage from "./ClientPatchPage";
import { getNoticiaById, getNoticias } from "@/lib/noticias/noticias-data";

export const dynamic = "force-dynamic";

interface PatchPageProps {
    params: { version: string };
}

// Generación de SEO (Metadata) dinámica
export async function generateMetadata({ params }: PatchPageProps): Promise<Metadata> {
    const supabase = getServiceClient();
    const slugTarget = `parche-${params.version}`;

    const { data: patchInfo } = await supabase
        .from("noticias")
        .select("titulo, contenido, imagen_portada")
        .eq("type", "lol_patch")
        .eq("slug", slugTarget)
        .single();

    if (!patchInfo) {
        return {
            title: "Parche no encontrado | KoreStats",
        };
    }

    const title = `Parche ${params.version.replace("-", ".")} LoL – Buffs, Nerfs y Cambios Completos`;
    const description = `Lista completa de cambios del parche ${params.version.replace("-", ".")} de League of Legends: campeones buffeados, nerfeados, objetos nuevos y ajustes oficiales de Riot.`;

    return {
        title,
        description,
        alternates: {
            canonical: `https://korestats.com/games/league-of-legends/patch/${params.version}`
        },
        openGraph: {
            title,
            description,
            images: patchInfo.imagen_portada ? [{ url: patchInfo.imagen_portada, width: 1200, height: 630 }] : [],
            type: "article",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: patchInfo.imagen_portada ? [patchInfo.imagen_portada] : [],
        },
    };
}

export default async function PatchPage({ params }: PatchPageProps) {
    const supabase = getServiceClient();
    const slugTarget = `parche-${params.version}`;

    // Obtener el ID de la noticia primero para usar getNoticiaById que ya tiene todos los joins
    const { data: basicInfo } = await supabase
        .from("noticias")
        .select("id")
        .eq("type", "lol_patch")
        .eq("slug", slugTarget)
        .single();

    if (!basicInfo) {
        notFound();
    }

    const noticia = await getNoticiaById(basicInfo.id);

    if (!noticia) {
        notFound();
    }

    // Schema estructurado para SEO
    const schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `League of Legends Parche ${params.version.replace("-", ".")} Cambios`,
        datePublished: noticia.fecha_publicacion,
        dateModified: noticia.updated_at || noticia.fecha_publicacion,
        author: {
            "@type": "Organization",
            name: "KoreStats",
        },
        publisher: {
            "@type": "Organization",
            name: "KoreStats",
            logo: {
                "@type": "ImageObject",
                url: "https://korestats.com/logo.png",
            },
        },
        image: noticia.imagen_portada ? [noticia.imagen_portada] : [],
        description: `Lista completa de cambios del parche ${params.version.replace("-", ".")} de League of Legends.`,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://korestats.com/games/league-of-legends/patch/${params.version}`
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
            />
            <ClientPatchPage
                patch={noticia}
                versionUrl={params.version.replace("-", ".")}
            />
        </>
    );
}

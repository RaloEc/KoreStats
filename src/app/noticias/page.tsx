import NoticiasPageClient from "./NoticiasPageClient";

export const dynamic =
  process.env.IS_MOBILE === "true" ? "auto" : "force-dynamic";
export const revalidate = 0;

export default function Noticias() {
  return <NoticiasPageClient />;
}

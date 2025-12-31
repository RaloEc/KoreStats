import BuscarPageClient from "./BuscarPageClient";

export const dynamic =
  process.env.IS_MOBILE === "true" ? "auto" : "force-dynamic";
export const revalidate = 0;

// Force rebuild v3
export default function BuscarPage() {
  return <BuscarPageClient />;
}

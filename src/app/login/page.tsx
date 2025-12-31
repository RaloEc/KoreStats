import LoginPageClient from "./LoginPageClient";

export const dynamic =
  process.env.IS_MOBILE === "true" ? "auto" : "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return <LoginPageClient />;
}

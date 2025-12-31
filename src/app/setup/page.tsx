import SetupForm from "@/components/setup/SetupForm";

export const dynamic =
  process.env.IS_MOBILE === "true" ? "auto" : "force-dynamic";

export default function SetupPage() {
  return <SetupForm />;
}

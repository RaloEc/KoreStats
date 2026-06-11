import { Unbounded } from "next/font/google";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-unbounded",
  display: "swap",
});

export default function PerfilLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className={unbounded.variable}>
      {children}
      {modal}
    </div>
  );
}

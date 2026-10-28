import { AuthForm } from "@/modules/auth/ui/form";

export const metadata = {
  title: "Masuk — Perencana Kebiasaan",
  description: "Masuk ke akun Perencana Kebiasaan",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <AuthForm variant="login" />
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { redirect } from "next/navigation";
import ScanlineOverlay from "@/components/scanline-overlay";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <ScanlineOverlay />
      <AdminNav />
      <main className="relative z-20 flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { AuthGate } from "@/components/auth/auth-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 px-6 lg:px-10 py-8 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}

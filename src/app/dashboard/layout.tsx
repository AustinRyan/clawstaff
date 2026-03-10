import { Sidebar } from "@/components/sidebar";
import { isDemoMode } from "@/lib/demo-mode";
import { DemoWrapper } from "@/components/demo/demo-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = isDemoMode();

  const content = (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 relative z-10">{children}</main>
    </div>
  );

  if (demo) {
    return <DemoWrapper>{content}</DemoWrapper>;
  }

  return content;
}

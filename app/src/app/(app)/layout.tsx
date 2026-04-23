import { AppShell } from "@/components/shell/AppShell";

export default function AppSurfacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

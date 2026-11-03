import { FloatingNav } from "@/components/ui/FloatingNav";

// The signed-in, paired screens share the floating nav (design §10.7).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <FloatingNav />
    </>
  );
}

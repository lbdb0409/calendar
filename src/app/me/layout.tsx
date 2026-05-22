import { StoreProvider } from "@/lib/store";
import { TopNav } from "@/components/TopNav";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <TopNav />
        {children}
      </div>
    </StoreProvider>
  );
}

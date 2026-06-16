import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { SpaceProvider } from "@/lib/space-context";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SpaceProvider>
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        <main className="pt-14">
          <Outlet />
        </main>
        <footer className="border-t border-border mt-20 py-8 text-center text-xs text-muted-foreground">
          Nous & Chill · une production privée · Saison en cours
        </footer>
      </div>
    </SpaceProvider>
  );
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("nous-and-chill-user");
    if (!raw) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="pt-14">
        <Outlet />
      </main>
      <footer className="border-t border-border mt-20 py-8 text-center text-xs text-muted-foreground">
        Nous & Chill · une production privée · Saison 1 en cours de tournage
      </footer>
    </div>
  );
}
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: ({ search }) => {
    const redirectTo =
      typeof (search as Record<string, unknown>).redirect === "string"
        ? ((search as Record<string, unknown>).redirect as string)
        : "/";

    throw redirect({ to: "/login", search: { redirect: redirectTo } });
  },
});

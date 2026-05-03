import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <ThemeProvider>
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
        <Outlet />
      </Suspense>
    </ThemeProvider>
  ),
});

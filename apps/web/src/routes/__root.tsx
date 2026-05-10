import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { makeHead } from "@workspace/seo";
import { getPublicOrigin } from "@/lib/public";
import appCss from "@/styles/globals.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored || 'system';
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (_) {}
})();
`;

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => {
    const seo = makeHead({
      title: "Booking Mate",
      baseUrl: getPublicOrigin(),
      path: "/",
    });

    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...seo.meta,
      ],
      links: [...seo.links, { rel: "stylesheet", href: appCss }],
      scripts: [{ children: themeInitScript }],
    };
  },
  shellComponent: RootDocument,
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you requested does not exist.</p>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unexpected error."}
        </p>
        <button onClick={reset} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          Try again
        </button>
      </div>
    </div>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Booking Mate" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [{ children: themeInitScript }],
  }),
  shellComponent: RootDocument,
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The page you requested does not exist.</p>
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

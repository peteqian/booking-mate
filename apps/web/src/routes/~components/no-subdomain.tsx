export function NoSubdomainPlaceholder() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Open via your booking subdomain</h1>
        <p className="text-muted-foreground">
          This page is served from your organization's booking host (e.g.{" "}
          <code>your-org.lvh.me</code>).
        </p>
      </div>
    </div>
  );
}

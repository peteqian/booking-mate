import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    const orgs = await authClient.organization.list();
    if (orgs.data && orgs.data.length > 0) {
      throw redirect({ to: "/" });
    }
  },
});

function Onboarding() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (!slugEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    setSlug(generateSlug(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await authClient.organization.create({
      name,
      slug,
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to create organization");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Create your organization</h1>
          <p className="text-muted-foreground">
            Set up your organization to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Organization Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Acme Inc"
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              Organization Slug
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={handleSlugChange}
              placeholder="acme-inc"
              className="w-full rounded-md border px-3 py-2"
              required
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs: /{slug}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </div>
    </div>
  );
}

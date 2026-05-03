import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { ApiError } from "@/lib/api";
import { getCurrentOrg, updateOrgSettings } from "@/lib/org";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }

    try {
      await getCurrentOrg();
      throw redirect({ to: "/" });
    } catch (error) {
      if (error instanceof ApiError && error.code === "organization_required") {
        return;
      }

      throw error;
    }
  },
});

function Onboarding() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
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

    try {
      const result = await authClient.organization.create({
        name,
        slug,
      });

      if (result.error) {
        setError(result.error.message ?? "Unable to create organization");
        setLoading(false);
        return;
      }

      await updateOrgSettings({
        contactEmail: contactEmail.trim() || null,
        currency,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create organization");
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
          <p className="text-muted-foreground">Set up your organization to get started</p>
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
            <p className="text-xs text-muted-foreground">Used in URLs: /{slug}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="contactEmail" className="text-sm font-medium">
              Contact Email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@example.com"
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AUD">AUD</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrgSettings } from "@/lib/org";
import { currentOrgQueryOptions } from "@/queries/auth";
import { orgKeys, orgSettingsQueryOptions } from "@/queries/org";

export function GeneralTab({ orgSlug }: { orgSlug: string }) {
  const orgQuery = useQuery(currentOrgQueryOptions);
  const settingsQuery = useQuery(orgSettingsQueryOptions);
  const queryClient = useQueryClient();

  const [contactEmail, setContactEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!settingsQuery.data) return;
    setContactEmail(settingsQuery.data.settings.contactEmail ?? "");
    setCurrency(settingsQuery.data.settings.currency);
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: (input: { contactEmail: string | null; currency: string }) =>
      updateOrgSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.settings() });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Save failed"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate({
      contactEmail: contactEmail.trim() || null,
      currency,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization details</CardTitle>
        <CardDescription>
          Name and slug are immutable. Update contact and currency below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">{orgQuery.data?.org.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <p className="text-sm text-muted-foreground">{orgSlug}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

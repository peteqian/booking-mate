/* eslint-disable react/no-children-prop */
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventFormState } from "@/lib/events";
import type { useEventDetailsForm } from "./use-event-details-form";

type FormApi = ReturnType<typeof useEventDetailsForm>;

export function EventDetailsForm({
  form,
  canManage,
}: {
  form: FormApi;
  canManage: boolean;
}) {
  return (
    <>
      <SectionJumpNav />
      <form
        id="event-details-form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="overflow-hidden rounded-2xl border bg-background shadow-xs"
      >
        <div className="border-b bg-muted/20 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">Core details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the schedule, public copy, capacity, and booking state.
          </p>
        </div>
        <div className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
          <div id="form-basics" className="scroll-mt-24 sm:col-span-2" aria-hidden />
          <form.Field
            name="title"
            children={(field) => (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={field.name}>Title</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  required
                />
              </div>
            )}
          />

          <form.Field
            name="date"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Date</Label>
                <DatePicker
                  id={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  required
                />
              </div>
            )}
          />
          <form.Field
            name="time"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Time</Label>
                <Input
                  id={field.name}
                  type="time"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  required
                />
              </div>
            )}
          />

          <form.Field
            name="duration"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Duration</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="1"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  required
                />
              </div>
            )}
          />
          <form.Field
            name="maxCapacity"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Capacity</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="1"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                />
              </div>
            )}
          />

          <form.Field
            name="location"
            children={(field) => (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={field.name}>Location</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                />
              </div>
            )}
          />

          <form.Field
            name="status"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Status</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as EventFormState["status"])}
                  disabled={!canManage}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          <form.Field
            name="visibility"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Visibility</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as EventFormState["visibility"])
                  }
                  disabled={!canManage}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <div id="form-details" className="scroll-mt-24 sm:col-span-2" aria-hidden />
          <form.Field
            name="category"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Category</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                />
              </div>
            )}
          />
          <form.Field
            name="price"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Price</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  required
                />
              </div>
            )}
          />

          <form.Field
            name="tags"
            children={(field) => (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={field.name}>Tags</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  placeholder="urgent, vip, sponsor (comma separated)"
                />
                <p className="text-xs text-muted-foreground">
                  Free-form labels for filtering and color hints. Comma separated.
                </p>
              </div>
            )}
          />
          <form.Field
            name="description"
            children={(field) => (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  className="min-h-28"
                />
                <p className="text-xs text-muted-foreground">Public-facing copy.</p>
              </div>
            )}
          />
          <form.Field
            name="notes"
            children={(field) => (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={field.name}>Internal notes</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={!canManage}
                  className="min-h-24"
                  placeholder="Setup, dietary, AV requirements…"
                />
                <p className="text-xs text-muted-foreground">Only visible to your team.</p>
              </div>
            )}
          />

          <div id="form-recurrence" className="scroll-mt-24 sm:col-span-2" aria-hidden />
          <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2">
            <div>
              <h3 className="font-medium">Recurrence</h3>
              <p className="text-sm text-muted-foreground">
                Stored on the event for future recurrence expansion.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field
                name="recurring"
                children={(field) => (
                  <div className="space-y-2">
                    <Label>Repeats</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as EventFormState["recurring"])
                      }
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              <form.Field
                name="recurrenceFrequency"
                children={(field) => (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={field.state.value || "none"}
                      onValueChange={(value) =>
                        field.handleChange(value === "none" || value === null ? "" : value)
                      }
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              <form.Field
                name="recurrenceInterval"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Interval</Label>
                    <Input
                      id={field.name}
                      type="number"
                      min="1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={!canManage}
                    />
                  </div>
                )}
              />
              <form.Field
                name="recurrenceEndDate"
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>End date</Label>
                    <DatePicker
                      id={field.name}
                      value={field.state.value}
                      onChange={(value) => field.handleChange(value)}
                      onBlur={field.handleBlur}
                      disabled={!canManage}
                    />
                  </div>
                )}
              />
              <form.Field
                name="recurrenceDays"
                children={(field) => (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={field.name}>Days of week</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={!canManage}
                      placeholder="monday, wednesday"
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

const detailSections: { id: string; label: string }[] = [
  { id: "form-basics", label: "Basics" },
  { id: "form-details", label: "Details" },
  { id: "form-recurrence", label: "Recurrence" },
];

function SectionJumpNav() {
  const jump = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav
      aria-label="Jump to form section"
      className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1"
    >
      {detailSections.map((section) => (
        <Button
          key={section.id}
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => jump(section.id)}
        >
          {section.label}
        </Button>
      ))}
    </nav>
  );
}

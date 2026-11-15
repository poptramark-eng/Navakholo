"use client";

import { MapPin, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/components/NavigationalLayout";
import WorkflowCards from "@/components/dashboard/WorkflowCards";

export default function OverviewPage() {
  const { user, loading, profileError } = useCurrentUser();
  const displayName = user?.name || user?.email || "your workspace";
  const schoolName = user?.school?.name;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Navakholo · Assessment workspace</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {user?.name ? `Welcome, ${user.name}` : "Workspace overview"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your starting point for the assessment workflows available to {displayName}.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="size-4 text-primary" />
          <span className="font-medium text-foreground">Scope</span>
          <span className="max-w-48 truncate" title={schoolName || "Scope not provided"}>
            {schoolName || "Not provided by profile"}
          </span>
        </div>
      </header>

      <section aria-labelledby="workflows-title" className="flex flex-col gap-4">
        <div>
          <h2 id="workflows-title" className="text-lg font-semibold tracking-tight">Available workflows</h2>
          <p className="mt-1 text-sm text-muted-foreground">Navigation is built from the signed-in profile&apos;s permission grants.</p>
        </div>
        {loading ? (
          <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <span className="sr-only">Loading available workflows</span>
            {[0, 1, 2].map((item) => <Skeleton key={item} className="min-h-56 rounded-xl" />)}
          </div>
        ) : user ? (
          <WorkflowCards permissions={user.permissions} />
        ) : (
          <Empty className="min-h-56 border border-dashed bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon"><ShieldCheck aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Account profile unavailable</EmptyTitle>
              <EmptyDescription>{profileError || "The workspace needs a signed-in profile before it can show available workflows."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      <section aria-label="Account context" className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account context</CardTitle>
            <CardDescription>Information returned by your signed-in profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">Account</dt>
                <dd className="mt-1 truncate text-sm font-medium">{user?.name || user?.email || "Loading profile"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">Email</dt>
                <dd className="mt-1 truncate text-sm font-medium">{user?.email || "Not provided"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">Account role</dt>
                <dd className="mt-1 truncate text-sm font-medium">{user?.role || "Not provided"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-muted-foreground">School scope</dt>
                <dd className="mt-1 truncate text-sm font-medium">{schoolName || "Not provided by profile"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="justify-center">
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <CardTitle>Access model</CardTitle>
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Workflow links are shown only when the profile service returns a matching permission grant. Role names are not used as a substitute.
            </p>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}

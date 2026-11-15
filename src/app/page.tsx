"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpenCheck, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/components/NavigationalLayout";
import WorkflowCards from "@/components/dashboard/WorkflowCards";

export default function OverviewPage() {
  const { user, loading, profileError } = useCurrentUser();
  const schoolName = user?.school?.name;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 py-6 sm:px-7 lg:px-10 lg:py-9">
      <section className="relative isolate overflow-hidden rounded-2xl bg-primary px-6 py-7 text-primary-foreground sm:px-9 sm:py-9">
        <div aria-hidden="true" className="absolute -right-14 -top-32 -z-10 size-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-2 -top-20 -z-10 size-56 rounded-full border border-white/10" />
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">CBE assessment workspace</Badge>
              <span className="text-xs text-white/65">Navakholo · Kenya</span>
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {user?.name ? `Good to see you, ${user.name.split(" ")[0]}` : "Your assessment workspace"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              A focused home for the assessment operations available to your account.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <MapPin aria-hidden="true" className="size-4 shrink-0 text-white/75" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/60">Your institution</span>
              <span className="max-w-56 truncate text-sm font-medium" title={schoolName || "Institution not provided by profile"}>{schoolName || "Not provided by profile"}</span>
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="workflows-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Workspace</p>
            <h2 id="workflows-title" className="mt-1 text-xl font-semibold tracking-tight">Available workflows</h2>
            <p className="mt-1 text-sm text-muted-foreground">Only sections provided by your signed-in profile are shown.</p>
          </div>
          {user && <Badge variant="outline" className="w-fit gap-1.5"><ShieldCheck aria-hidden="true" />Permission scoped</Badge>}
        </div>
        {loading ? (
          <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <span className="sr-only">Loading available workflows</span>
            {[0, 1, 2].map((item) => <Skeleton key={item} className="min-h-48 rounded-xl" />)}
          </div>
        ) : user ? (
          <WorkflowCards permissions={user.permissions} />
        ) : (
          <Empty className="min-h-52 rounded-xl border border-dashed bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon"><ShieldCheck aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Account profile unavailable</EmptyTitle>
              <EmptyDescription>{profileError || "A signed-in profile is required to load your workspace."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      <section aria-label="Account and assessment guidance" className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-base">Account context</CardTitle>
              <CardDescription>Details returned by your authenticated profile.</CardDescription>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><BadgeCheck aria-hidden="true" className="size-5" /></span>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Account</dt><dd className="mt-1 truncate text-sm font-medium">{user?.name || user?.email || "Loading profile"}</dd></div>
              <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Email</dt><dd className="mt-1 truncate text-sm font-medium">{user?.email || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Account role</dt><dd className="mt-1 truncate text-sm font-medium">{user?.role || "Not provided"}</dd></div>
              <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Institution</dt><dd className="mt-1 truncate text-sm font-medium">{schoolName || "Not provided by profile"}</dd></div>
            </dl>
            {user && <Link href="/dashboard/profile" className="mt-6 inline-flex min-h-9 items-center gap-2 rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">View account profile <ArrowRight aria-hidden="true" className="size-4" /></Link>}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5"><CardTitle className="text-base">Built for accountable assessment</CardTitle><CardDescription>Operational clarity, with access kept in scope.</CardDescription></div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><BookOpenCheck aria-hidden="true" className="size-5" /></span>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              <li className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-muted-foreground">Profile-led institution context</span><Badge variant="secondary">Enabled</Badge></li>
              <li className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-muted-foreground">Permission-aware navigation</span><Badge variant="secondary">Enabled</Badge></li>
              <li className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-muted-foreground">Assessment operations</span><span className="text-xs text-muted-foreground">As granted</span></li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Navakholo assessment management</span>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="size-3.5" /> Secure institutional access</span>
      </footer>
    </div>
  );
}

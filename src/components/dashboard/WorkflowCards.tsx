import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getVisibleNavigationItems } from "@/lib/navigation";

export default function WorkflowCards({ permissions }: { permissions: readonly string[] | undefined }) {
  const workflows = getVisibleNavigationItems(permissions).filter((item) => item.href !== "/");

  if (workflows.length === 0) {
    return (
      <Empty className="min-h-56 border border-dashed bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldCheck aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>Profile permissions are not available</EmptyTitle>
          <EmptyDescription>
            No supported workflow grants were returned for this profile. Workflow links will appear when the profile service provides matching permissions.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {workflows.map((workflow) => {
        const Icon = workflow.icon;
        return (
          <li key={workflow.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
                <CardDescription className="font-medium">Workspace</CardDescription>
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <CardTitle className="text-base">{workflow.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm leading-6 text-muted-foreground">{workflow.description}</p>
              </CardContent>
              <CardFooter>
                <Link href={workflow.href} className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                  Open {workflow.label.toLowerCase()}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

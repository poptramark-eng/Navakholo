const statistics = [
  {
    title: "Total Candidates",
    value: "0",
    change: "Registered learners",
    icon: "users",
    iconStyle: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Assessments",
    value: "0",
    change: "Created examinations",
    icon: "clipboard",
    iconStyle: "bg-blue-50 text-blue-600",
  },
  {
    title: "Subjects",
    value: "0",
    change: "Available subjects",
    icon: "book",
    iconStyle: "bg-violet-50 text-violet-600",
  },
  {
    title: "Schools",
    value: "0",
    change: "Participating institutions",
    icon: "school",
    iconStyle: "bg-emerald-50 text-emerald-600",
  },
];

function StatIcon({ name }: { name: string }) {
  const common = "h-6 w-6";

  switch (name) {
    case "users":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
        </svg>
      );
    case "book":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM4 17a2.5 2.5 0 0 1 2.5-2.5H20" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01" />
        </svg>
      );
  }
}

function StatCard({ item }: { item: (typeof statistics)[number] }) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {item.title}
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {item.value}
          </h2>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconStyle}`}>
          <StatIcon name={item.icon} />
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500">{item.change}</p>
      </div>
    </article>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function OverviewCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-5 transition-colors hover:bg-slate-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
        {icon === "results" ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <main className="min-h-full space-y-8 bg-slate-50/70 p-5 md:p-8 lg:p-10">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Examination management
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Welcome back. Here's an overview of your examination system.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          System overview
        </div>
      </header>

      {/* Statistics */}
      <section className="space-y-4">
        <SectionHeading
          title="System statistics"
          description="A quick summary of your examination records."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.map((item) => (
            <StatCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      {/* Overview */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <SectionHeading
            title="Examination overview"
            description="Manage and monitor your examination activities."
          />
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <OverviewCard
            title="Results management"
            description="Manage candidate scores, review subject performance, and prepare examination results."
            icon="results"
          />

          <OverviewCard
            title="Recent activity"
            description="Track candidate registrations, assessment updates, and recent score submissions."
            icon="activity"
          />
        </div>
      </section>

      {/* Empty state */}
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6" />
          </svg>
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          Your dashboard is ready
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Once examination data is available, this area can display performance
          trends, score summaries, and other useful insights.
        </p>
      </section>
    </main>
  );
}
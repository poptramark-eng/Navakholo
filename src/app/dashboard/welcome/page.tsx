
import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl">

        <div className="text-center mb-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-bold text-white">
            E
          </div>

          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Examination Management System
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Welcome to your examination workspace.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Manage examination activities, student records,
            assessments, and academic performance from one
            centralized platform.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              New to the platform?
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Create an account to get started. Your account
              access will depend on the role assigned to you.
            </p>

            <Link
              href="/dashboard/register"
              className="mt-7 flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Create an account
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Already registered?
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              Sign in using your registered credentials to
              access your examination workspace.
            </p>

            <Link
              href="/dashboard/login"
              className="mt-7 flex w-full items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>

        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Secure examination and academic records management.
        </p>

      </div>
    </main>
  );
}

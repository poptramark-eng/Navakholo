
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function home(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    const payload = {
      name: (form.get("subject") as string).trim(),
      code: (form.get("code") as string).trim(),
    };

    try {
      const response = await fetch("/api/subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const message: {
        message?: string;
        error?: string;
      } = await response.json();

      if (
        response.ok &&
        message.message === "Subject created successfully"
      ) {
        router.push("/");
        router.refresh();
      } else {
        setError(message.error || "Unable to create subject.");
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10 md:px-10">
      <div className="mx-auto max-w-2xl">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Academic Management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Create Subject
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Register a new subject by providing its name and identification
            code.
          </p>
        </div>

        {/* Form card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              Subject Information
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the subject details below.
            </p>
          </div>

          <form onSubmit={home}>
            <div className="space-y-6 p-6">
              {/* Subject name */}
              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Subject Name
                </label>

                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="e.g. Mathematics"
                  required
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  Enter the full name of the subject.
                </p>
              </div>

              {/* Subject code */}
              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Subject Code
                </label>

                <input
                  type="text"
                  id="code"
                  name="code"
                  placeholder="e.g. MAT"
                  required
                  maxLength={20}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm uppercase text-gray-900 outline-none transition placeholder:normal-case placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  Provide a unique identification code.
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating..." : "Add Subject"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

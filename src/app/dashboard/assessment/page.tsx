
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateAssessmentPage() {
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(
      formData.get("assessment") ?? ""
    ).trim();

    const year = Number(formData.get("year"));

    // Client-side validation
    if (!name) {
      setError("Please provide an assessment name.");
      return;
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      setError("Please provide a valid assessment year.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          year,
        }),
      });

      const result: {
        message?: string;
        error?: string;
        data?: {
          id: string;
          name: string;
          year: number;
        };
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Failed to create assessment."
        );
      }

      form.reset();

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 md:px-10">
      <div className="mx-auto max-w-2xl">

        {/* Page heading */}
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-600">
            Assessment Management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            Create Assessment
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Create a new assessment period for student registration
            and academic performance tracking.
          </p>
        </div>

        {/* Assessment form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >

          {/* Card heading */}
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-base font-semibold text-gray-900">
              Assessment Details
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the assessment information below.
            </p>
          </div>

          {/* Form fields */}
          <div className="space-y-6 p-6">

            {/* Assessment name */}
            <div className="space-y-2">
              <label
                htmlFor="assessment"
                className="block text-sm font-medium text-gray-700"
              >
                Assessment Name
              </label>

              <input
                type="text"
                id="assessment"
                name="assessment"
                required
                maxLength={150}
                placeholder="e.g. Term One Assessment"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="text-xs text-gray-500">
                Provide a descriptive name for the assessment.
              </p>
            </div>

            {/* Assessment year */}
            <div className="space-y-2">
              <label
                htmlFor="year"
                className="block text-sm font-medium text-gray-700"
              >
                Assessment Year
              </label>

              <input
                type="number"
                id="year"
                name="year"
                required
                min="2000"
                max="2100"
                step="1"
                defaultValue={currentYear}
                placeholder="e.g. 2026"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="text-xs text-gray-500">
                Specify the academic year for this assessment.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Assessment"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

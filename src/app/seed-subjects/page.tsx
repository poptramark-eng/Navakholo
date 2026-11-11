
"use client";

import { useState } from "react";

const subjects = [
  { name: "English", code: "ENGLISH" },
  { name: "Kiswahili", code: "KISWAHILI" },
  { name: "Indigenous Language", code: "INDIGENOUS_LANGUAGE" },
  { name: "Mathematics", code: "MATHEMATICS" },
  { name: "Environmental Activities", code: "ENVIRONMENTAL_ACTIVITIES" },
  { name: "Creative Arts", code: "CREATIVE_ARTS" },
  { name: "Religious Education", code: "RELIGIOUS_EDUCATION" },
  { name: "Science and Technology", code: "SCIENCE_TECHNOLOGY" },
  { name: "Social Studies", code: "SOCIAL_STUDIES" },
  { name: "Agriculture and Nutrition", code: "AGRICULTURE_NUTRITION" },
  { name: "Integrated Science", code: "INTEGRATED_SCIENCE" },
  { name: "Pre-Technical Studies", code: "PRE_TECHNICAL_STUDIES" },
  { name: "Creative Arts and Sports", code: "CREATIVE_ARTS_SPORTS" },
];

type Result = {
  name: string;
  code: string;
  status: "created" | "exists" | "failed";
  message: string;
};

export default function SeedSubjectsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");

  async function handleSeed() {
    setLoading(true);
    setResults([]);
    setError("");

    const output: Result[] = [];

    try {
      const existingResponse = await fetch("/api/subject", {
        method: "GET",
        cache: "no-store",
      });

      const existingData = await existingResponse.json();

      if (!existingResponse.ok) {
        throw new Error(
          existingData.error || "Could not retrieve existing subjects"
        );
      }

      const existingCodes = new Set<string>(
        (existingData.data ?? []).map(
          (subject: { code: string }) => subject.code
        )
      );

      for (const subject of subjects) {
        if (existingCodes.has(subject.code)) {
          output.push({
            ...subject,
            status: "exists",
            message: "Already exists",
          });

          setResults([...output]);
          continue;
        }

        try {
          const response = await fetch("/api/subject", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(subject),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to create subject");
          }

          output.push({
            ...subject,
            status: "created",
            message: "Created successfully",
          });
        } catch (err) {
          output.push({
            ...subject,
            status: "failed",
            message:
              err instanceof Error ? err.message : "Unknown error",
          });
        }

        setResults([...output]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Seeding failed"
      );
    } finally {
      setLoading(false);
    }
  }

  const created = results.filter(
    (item) => item.status === "created"
  ).length;

  const exists = results.filter(
    (item) => item.status === "exists"
  ).length;

  const failed = results.filter(
    (item) => item.status === "failed"
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <header>
          <h1 className="text-2xl font-bold">
            Subject Seeder
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Populate the database with the learning areas used by the
            results module.
          </p>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Subjects</h2>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
              {subjects.length} records
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {subjects.map((subject) => (
              <div
                key={subject.code}
                className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center"
              >
                <span className="text-sm font-medium">
                  {subject.name}
                </span>

                <code className="text-xs text-gray-500">
                  {subject.code}
                </code>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSeed}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Seeding..." : "Seed Database"}
          </button>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold">Results</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-green-700">Created</p>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {created}
                </p>
              </div>

              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="text-xs text-yellow-700">Existing</p>
                <p className="mt-1 text-2xl font-bold text-yellow-700">
                  {exists}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-xs text-red-700">Failed</p>
                <p className="mt-1 text-2xl font-bold text-red-700">
                  {failed}
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {results.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {item.message}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "created"
                        ? "bg-green-100 text-green-700"
                        : item.status === "exists"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";

export function ActivityCalendar({
  year,
  monthIndex,
  dayCounts,
  selectedDay,
  monthParam,
}: {
  year: number;
  monthIndex: number;
  dayCounts: Record<string, number>;
  selectedDay: string | null;
  monthParam: string;
}) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // Monday-first
  let startWeekday = first.getDay() - 1;
  if (startWeekday < 0) startWeekday = 6;

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null, key: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-gray-500 py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => {
          if (cell.day == null || !cell.key) {
            return <div key={`e-${idx}`} className="min-h-[72px] rounded bg-gray-50" />;
          }
          const count = dayCounts[cell.key] || 0;
          const isSelected = selectedDay === cell.key;
          const hasActivity = count > 0;

          return (
            <Link
              key={cell.key}
              href={
                hasActivity
                  ? `/activity?month=${monthParam}&day=${cell.key}`
                  : `/activity?month=${monthParam}`
              }
              className={`min-h-[72px] rounded border p-2 flex flex-col items-start transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : hasActivity
                    ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                    : "border-gray-100 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-medium text-gray-800">{cell.day}</span>
              {hasActivity && (
                <span className="mt-auto text-lg font-bold text-amber-700">{count}</span>
              )}
              {hasActivity && (
                <span className="text-[10px] text-amber-600">
                  msg{count === 1 ? "" : "s"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
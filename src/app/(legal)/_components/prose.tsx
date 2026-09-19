import type { ReactNode } from "react";

/** Typographic wrapper for long-form legal text: readable measure, clear hierarchy, no clutter. */
export function Prose({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="animate-fade-up">
      <h1 className="font-display text-5xl leading-tight tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-subtle">{updated}</p>
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-3xl [&_li]:pl-1 [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

export function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="-mx-1 mt-4 overflow-x-auto px-1">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-strong text-xs uppercase tracking-wider text-subtle">
            {head.map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-border align-top">
              {r.map((c, i) => (
                <td key={i} className={i === 0 ? "py-3 pr-4 font-medium" : "py-3 pr-4 text-muted"}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

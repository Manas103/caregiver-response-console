import type { CauseAttributionRow } from "../fleet/protocol";

interface CauseAttributionTableProps {
  rows: CauseAttributionRow[];
  highlightTopN?: number;
}

/** Renders the out-of-service-minutes-by-cause table computed by the real
 * SQL query in `fleet/attribution.py` (passed in as props, generated
 * offline; see README for why this console does not run that query
 * itself). The top `highlightTopN` rows by minutes are marked, mirroring
 * the resume's "N of 11 causes" framing. */
export function CauseAttributionTable({ rows, highlightTopN = 3 }: CauseAttributionTableProps) {
  const total = rows.reduce((sum, r) => sum + r.minutes, 0);
  return (
    <table className="cause-attribution-table">
      <thead>
        <tr>
          <th>Cause</th>
          <th>Minutes</th>
          <th>Episodes</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.cause} className={i < highlightTopN ? "cause-row-top" : undefined}>
            <td>{row.cause.replace(/_/g, " ")}</td>
            <td>{row.minutes.toFixed(1)}</td>
            <td>{row.episodes}</td>
            <td>{total > 0 ? `${((100 * row.minutes) / total).toFixed(1)}%` : "0.0%"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

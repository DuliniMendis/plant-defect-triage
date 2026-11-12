// How often reviewers changed each review form field (R42), most often first.
// Each bar carries its count as text, so the figure never relies on the bar.
export function FieldChanges({
  fields,
  approved,
}: {
  fields: readonly { path: string; label: string; count: number }[];
  approved: number;
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Times each field was changed</caption>
      <thead>
        <tr className="text-left text-text-muted">
          <th scope="col" className="w-40 pb-2 font-normal">
            Field
          </th>
          <th scope="col" className="pb-2 font-normal">
            Times changed, out of {approved}
          </th>
        </tr>
      </thead>
      <tbody>
        {fields.map(({ path, label, count }) => {
          const share = approved ? count / approved : 0;
          return (
            <tr key={path} className="border-t border-line">
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                {label}
              </th>
              <td className="py-2">
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-sm bg-surface-raised">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums">{count}</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

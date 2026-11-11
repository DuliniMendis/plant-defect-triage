// Red asterisk for a required field (requirements v5, R10). Hidden from screen
// readers, which hear the field as required (aria-required) instead.
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-status-down">
      *
    </span>
  );
}

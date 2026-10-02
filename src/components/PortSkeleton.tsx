const PLACEHOLDER_ROWS = [0, 1, 2, 3, 4];

export function PortSkeleton() {
  return (
    <ul className="port-list" aria-hidden="true">
      {PLACEHOLDER_ROWS.map((index) => (
        <li className="port-row skeleton" key={index}>
          <div className="skeleton__bar skeleton__bar--main" />
          <div className="skeleton__bar skeleton__bar--meta" />
        </li>
      ))}
    </ul>
  );
}

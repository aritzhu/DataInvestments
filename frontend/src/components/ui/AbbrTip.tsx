import { ABBREVIATIONS } from '../../utils/abbreviations';

export function AbbrTip({ abbr, className }: { abbr: string; className?: string }) {
  const tip = ABBREVIATIONS[abbr];
  if (!tip) return <>{abbr}</>;
  return (
    <span className={`abbr-tip${className ? ` ${className}` : ''}`} data-tip={tip} tabIndex={0}>
      {abbr}
    </span>
  );
}

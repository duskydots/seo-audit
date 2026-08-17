export function HealthScore({ score, label }: { score: number | undefined; label: string }) {
  if (score === undefined) return <span className="health-score health-unavailable">N/A</span>;
  const tone = score >= 85 ? "good" : score >= 60 ? "warn" : "bad";
  return (
    <span className={`health-score health-${tone}`} title={`${label}: ${score} out of 100`}>
      {score}
    </span>
  );
}

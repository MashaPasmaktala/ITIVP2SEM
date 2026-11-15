// Звёздочки рейтинга: ★★★★☆
export default function Stars({ value }) {
  const v = Math.round(value || 0);
  return (
    <span className="stars" title={`${value || 0} из 5`}>
      {'★'.repeat(v)}
      <span className="stars-empty">{'★'.repeat(5 - v)}</span>
    </span>
  );
}

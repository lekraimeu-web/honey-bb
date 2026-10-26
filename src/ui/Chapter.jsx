export default function Chapter({ num, title }) {
  return (
    <div className="chapter fade-in" key={title}>
      <span className="num">{num}</span>
      <span className="ttl">{title}</span>
    </div>
  )
}

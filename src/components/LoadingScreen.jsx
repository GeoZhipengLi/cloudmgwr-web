import Brand from './Brand'

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Brand />
      <div className="spinner" />
      <p>Connecting to CloudMGWR…</p>
    </div>
  )
}

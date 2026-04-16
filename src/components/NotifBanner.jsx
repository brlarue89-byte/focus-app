import { useApp } from '../context/AppContext'

export default function NotifBanner() {
  const { banner } = useApp()
  if (!banner) return null
  return <div className="notif-banner">{banner}</div>
}

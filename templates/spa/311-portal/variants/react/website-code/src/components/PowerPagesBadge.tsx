import powerPagesLogo from '../assets/PowerPages_scalable.svg'
import './PowerPagesBadge.css'

export default function PowerPagesBadge() {
  return (
    <aside className="powered-badge" aria-label="Platform attribution">
      <img src={powerPagesLogo} width="14" height="14" alt="" aria-hidden="true" />
      Built with <span>Microsoft Power Pages</span>
    </aside>
  )
}

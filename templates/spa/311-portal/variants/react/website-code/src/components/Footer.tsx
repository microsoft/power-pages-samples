import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import ZavaLogo from './ZavaLogo'
import './Footer.css'

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label={t('header.logoAria')}>
              <ZavaLogo size={28} variant="light" />
              <div className="footer-logo-wordmark">
                <span className="footer-logo-text">ZAVA</span>
                <span className="footer-logo-311">311</span>
              </div>
            </Link>
            <p className="footer-tagline">
              {t('footer.tagline')}
            </p>
          </div>

          <div className="footer-col">
            <h2 className="footer-heading">{t('footer.servicesHeading')}</h2>
            <Link to="/services" className="footer-link">{t('footer.browseAllServices')}</Link>
            <Link to="/services" className="footer-link">{t('footer.roadsSidewalks')}</Link>
            <Link to="/services" className="footer-link">{t('footer.wasteRecycling')}</Link>
            <Link to="/services" className="footer-link">{t('footer.parksGreenSpaces')}</Link>
          </div>

          <div className="footer-col">
            <h2 className="footer-heading">{t('footer.helpHeading')}</h2>
            <Link to="/track" className="footer-link">{t('footer.trackRequest')}</Link>
            <Link to="/knowledge" className="footer-link">{t('footer.knowledgeBase')}</Link>
            <Link to="/contact" className="footer-link">{t('footer.contactUs')}</Link>
            <Link to="/requests/map" className="footer-link">{t('footer.exploreRequests')}</Link>
          </div>

          <div className="footer-col">
            <h2 className="footer-heading">{t('footer.contactHeading')}</h2>
            <p className="footer-contact-item">
              <span className="footer-contact-label">{t('footer.phone')}</span> (555) 012-0311
            </p>
            <p className="footer-contact-item">
              <span className="footer-contact-label">{t('footer.email')}</span> services@zavacity.gov
            </p>
            <p className="footer-contact-item">
              <span className="footer-contact-label">{t('footer.hours')}</span> {t('footer.hoursTimes')}
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} {t('footer.copyright')}
          </p>
          <div className="footer-bottom-links">
            <span className="footer-bottom-link">{t('footer.privacyPolicy')}</span>
            <span className="footer-bottom-link">{t('footer.termsOfUse')}</span>
            <Link to="/contact" className="footer-bottom-link">{t('footer.accessibility')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

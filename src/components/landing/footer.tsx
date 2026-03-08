import s from './landing.module.css';

export function Footer() {
  return (
    <footer className={s.footer} id="footer">
      <div className={s.container}>
        <div className={s.footerSimple}>
          <div className={s.footerBrandLogo}>
            <div className={s.footerBrandLogoMark} />
            WareOS
          </div>
          <p className={s.footerBrandDesc}>Warehouse intelligence for modern operations.</p>
          <div className={s.footerSimpleLinks}>
            <a href="#" className={s.footerSimpleLinksA}>Contact</a>
            {' \u00b7 '}
            <a href="#" className={s.footerSimpleLinksA}>Privacy</a>
          </div>
        </div>
        <div className={s.footerBottom}>
          <div className={s.footerCopy}>&copy; 2026 WareOS. All rights reserved.</div>
          <div className={s.footerLegal}>
            <a href="#" className={s.footerLegalA}>Privacy</a>
            <a href="#" className={s.footerLegalA}>Terms</a>
            <a href="#" className={s.footerLegalA}>Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

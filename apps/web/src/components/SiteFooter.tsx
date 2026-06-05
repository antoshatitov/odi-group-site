const SiteFooter = () => {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="stack">
          <div className="footer-logo">
            <img
              src="/images/logo_bg_white.png"
              alt="ОДИ"
              width={240}
              height={70}
              loading="lazy"
              decoding="async"
            />
          </div>
          <p className="muted">
            Строительство индивидуальных домов в Калининграде и области. Проектируем,
            строим, контролируем качество и сроки.
          </p>
        </div>
        <div className="stack">
          <strong>Контакты</strong>
          <a href="tel:+79244422800">+7 924 442-28-00</a>
          <a href="mailto:bon2801@yandex.ru">bon2801@yandex.ru</a>
          <span>Калининград, ул. Третьяковская 2, офис 209</span>
        </div>
        <div className="stack">
          <strong>Документы</strong>
          <a href="/policy">Политика обработки данных</a>
          <a href="/consent">Согласие на обработку данных</a>
          <a href="/cookies">Cookie-политика</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span className="muted">© 2026 ООО «ОДИГРУПП». Все права защищены.</span>
        <span className="muted">
          ИНН: 2016007291
          <br />
          ОГРН: 1232000006754
        </span>
      </div>
    </footer>
  )
}

export default SiteFooter

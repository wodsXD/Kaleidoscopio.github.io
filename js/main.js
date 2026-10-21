// Interacciones compartidas: menú móvil, animaciones, copiar dirección y año.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  const setNav = open => {
    nav.classList.toggle('open', open);
    toggle.classList.toggle('active', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  toggle?.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
  window.addEventListener('resize', () => { if (window.innerWidth > 960) setNav(false); });

  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
    }), { threshold: 0.12 });
    items.forEach(i => io.observe(i));
  } else items.forEach(i => i.classList.add('is-visible'));

  const btn = document.getElementById('copyAddress');
  const fb = document.querySelector('.copy-feedback');
  btn?.addEventListener('click', async () => {
    const address = 'Calle Cortázar, zona Centro, Irapuato, Guanajuato';
    try { await navigator.clipboard.writeText(address); fb.textContent = 'Dirección copiada ✓'; }
    catch (e) { fb.textContent = address; }
    btn.innerHTML = 'Copiado <span>✓</span>';
    setTimeout(() => { btn.innerHTML = 'Copiar dirección <span>＋</span>'; fb.textContent = ''; }, 2600);
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});

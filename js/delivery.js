// Pedido a domicilio: filtros, carrito, mapa de la zona y límite de 4 km.
document.addEventListener('DOMContentLoaded', () => {
  // ⚠ Ajusta estas coordenadas a la ubicación exacta de la tienda (clic derecho en Google Maps > copiar coordenadas).
  const STORE = [20.6767, -101.3547];
  const MAX_KM = 4;

  /* ---------- Mapa y zona de entrega ---------- */
  const mapEl = document.getElementById('zoneMap');
  const statusEl = document.getElementById('zoneStatus');
  const miniEl = document.getElementById('zoneStatusMini');
  const input = document.getElementById('deliveryAddress');
  let map, pin, zone = { km: null, ok: false, label: '' };

  const setStatus = (msg, cls = '') => {
    statusEl.textContent = msg; statusEl.className = 'zone-status ' + cls;
    miniEl.textContent = msg; miniEl.className = 'zone-mini ' + cls;
  };

  function setPoint(lat, lng, label) {
    const km = map.distance(STORE, [lat, lng]) / 1000;
    zone = { km, ok: km <= MAX_KM, label: label || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    if (pin) pin.setLatLng([lat, lng]); else pin = L.marker([lat, lng]).addTo(map);
    map.fitBounds(L.latLngBounds([STORE, [lat, lng]]).pad(0.35));
    setStatus(zone.ok
      ? `✓ ¡Sí llegamos! Estás a ${km.toFixed(1)} km de la tienda.`
      : `✕ Fuera de zona: estás a ${km.toFixed(1)} km y solo entregamos hasta ${MAX_KM} km.`, zone.ok ? 'ok' : 'bad');
  }

  if (mapEl && window.L) {
    map = L.map(mapEl, { scrollWheelZoom: false, dragging: !L.Browser.mobile });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    const area = L.circle(STORE, { radius: MAX_KM * 1000, color: '#e76c42', weight: 2, fillColor: '#e76c42', fillOpacity: 0.12 }).addTo(map);
    L.marker(STORE, { icon: L.divIcon({ className: 'store-pin', html: '✳', iconSize: [34, 34], iconAnchor: [17, 17] }) })
      .addTo(map).bindPopup('Kaleidoscopio · Calle Cortázar, Centro');
    map.fitBounds(area.getBounds());
    map.on('click', e => setPoint(e.latlng.lat, e.latlng.lng, 'Punto marcado en el mapa'));
    setTimeout(() => map.invalidateSize(), 300);
    window.addEventListener('resize', () => map.invalidateSize());

    document.getElementById('zoneForm').addEventListener('submit', async e => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return setStatus('Escribe tu colonia o dirección, o toca el mapa.', 'bad');
      setStatus('Buscando tu dirección…');
      try {
        const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&q=' + encodeURIComponent(q + ', Irapuato, Guanajuato');
        const data = await (await fetch(url, { headers: { 'Accept-Language': 'es' } })).json();
        if (!data.length) return setStatus('No encontramos esa dirección. Toca el mapa para marcar tu punto.', 'bad');
        setPoint(+data[0].lat, +data[0].lon, q);
      } catch (err) { setStatus('No pudimos buscar la dirección. Toca el mapa para marcarla.', 'bad'); }
    });

    document.getElementById('useLocation').addEventListener('click', () => {
      if (!navigator.geolocation) return setStatus('Tu navegador no permite usar la ubicación.', 'bad');
      setStatus('Obteniendo tu ubicación…');
      navigator.geolocation.getCurrentPosition(
        p => setPoint(p.coords.latitude, p.coords.longitude, 'Mi ubicación'),
        () => setStatus('No pudimos obtener tu ubicación. Toca el mapa para marcarla.', 'bad'),
        { timeout: 10000 });
    });
  } else if (mapEl) {
    mapEl.innerHTML = '<p class="map-fallback">No se pudo cargar el mapa. Revisa tu conexión a internet.</p>';
  }

  /* ---------- Carrito ---------- */
  const cart = new Map();
  const money = v => `$${v} MXN`;
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');
  const feedback = document.getElementById('orderFeedback');
  const totalNow = () => [...cart.values()].reduce((s, i) => s + i.price * i.quantity, 0);

  function renderCart() {
    const entries = [...cart.values()];
    cartCount.textContent = entries.reduce((s, i) => s + i.quantity, 0);
    cartTotal.textContent = money(totalNow());
    if (!entries.length) { cartItems.innerHTML = '<p class="cart-empty">Tu carrito está esperando su primera estrella.</p>'; return; }
    cartItems.innerHTML = entries.map(i => `<div class="cart-item"><span class="cart-item-name">${i.name}<br><small>${money(i.price)} c/u</small></span><span class="cart-item-controls"><button type="button" data-action="minus" data-id="${i.id}" aria-label="Quitar uno de ${i.name}">−</button><b>${i.quantity}</b><button type="button" data-action="plus" data-id="${i.id}" aria-label="Agregar uno de ${i.name}">+</button></span></div>`).join('');
  }

  document.querySelectorAll('.add-to-cart').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.delivery-card'), id = card.dataset.id;
    if (cart.has(id)) cart.get(id).quantity += 1;
    else cart.set(id, { id, name: card.dataset.name, price: Number(card.dataset.price), quantity: 1 });
    renderCart();
    feedback.textContent = `${card.dataset.name} se agregó a tu pedido.`;
    btn.innerHTML = 'Agregado <span>✓</span>';
    setTimeout(() => { btn.innerHTML = 'Agregar <span>＋</span>'; }, 900);
  }));

  cartItems.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]'); if (!btn) return;
    const item = cart.get(btn.dataset.id); if (!item) return;
    item.quantity += btn.dataset.action === 'plus' ? 1 : -1;
    if (item.quantity <= 0) cart.delete(item.id);
    renderCart();
  });

  document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
    document.querySelectorAll('.delivery-card').forEach(card =>
      card.classList.toggle('is-hidden', chip.dataset.filter !== 'todos' && card.dataset.category !== chip.dataset.filter));
  }));

  document.getElementById('checkoutDemo').addEventListener('click', () => {
    if (!cart.size) { feedback.textContent = 'Agrega al menos un producto para armar tu pedido.'; return; }
    if (zone.km === null) { feedback.textContent = 'Primero verifica tu dirección en el mapa de entrega.'; return; }
    if (!zone.ok) { feedback.textContent = `Tu ubicación está a ${zone.km.toFixed(1)} km: solo entregamos hasta ${MAX_KM} km de la tienda.`; return; }
    feedback.textContent = `¡Pedido de muestra listo! ${cartCount.textContent} producto(s), ${money(totalNow())} · Entrega: ${zone.label} (${zone.km.toFixed(1)} km). No se envió ningún pedido real.`;
  });
});

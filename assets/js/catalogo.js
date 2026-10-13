(() => {
  const EUR = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  });

  const el = id => document.getElementById(id);
  const ruta = f => String(f || '').replace(/^\//, '');

  // Escapa texto antes de insertarlo en HTML. Imprescindible: las tallas
  // llevan comillas (17,5") y romperían los atributos.
  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const rejilla = el('rejilla');
  let PRODUCTOS = [];

  function rellenarSelect(select, valores, etiquetaTodas) {
    select.innerHTML = `<option value="todas">${esc(etiquetaTodas)}</option>` +
      valores.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  }

  function unicos(campo) {
    return [...new Set(PRODUCTOS.map(p => p[campo]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
  }

  function tarjeta(p) {
    const vendida = p.estado === 'vendida';
    const foto = ruta(p.fotos?.[0]);

    let etiqueta = '';
    if (vendida) etiqueta = '<span class="etiqueta etiqueta--vendida">Vendida</span>';
    else if (p.estado === 'reservada') etiqueta = '<span class="etiqueta etiqueta--reservada">Reservada</span>';
    else if (p.novedad) etiqueta = '<span class="etiqueta etiqueta--nueva">Nueva entrada</span>';

    const imagen = foto
      ? `<img src="${esc(foto)}" alt="${esc(p.marca)} ${esc(p.modelo)}" loading="lazy">`
      : `<div class="sin-foto"><img src="assets/img/isotipo.png" alt=""></div>`;

    return `
      <a class="tarjeta ${vendida ? 'tarjeta--vendida' : ''}" href="montura.html?id=${encodeURIComponent(p.id)}">
        <div class="tarjeta__marco">
          ${etiqueta}
          ${imagen}
        </div>
        <div class="tarjeta__cuerpo">
          <p class="tarjeta__categoria">${esc(p.categoria)}</p>
          <h3 class="tarjeta__titulo">${esc(p.marca)}</h3>
          <p class="tarjeta__modelo">${esc(p.modelo)}</p>
          <div class="tarjeta__pie">
            <span class="tarjeta__precio">${vendida ? '—' : EUR.format(p.precio || 0)}</span>
            <span class="tarjeta__talla">${esc(p.talla)}</span>
          </div>
        </div>
      </a>`;
  }

  function aplicar() {
    const q = el('f-busqueda').value.trim().toLowerCase();
    const cat = el('f-categoria').value;
    const marca = el('f-marca').value;
    const talla = el('f-talla').value;
    const estado = el('f-estado').value;
    const orden = el('f-orden').value;

    const lista = PRODUCTOS.filter(p => {
      if (cat !== 'todas' && p.categoria !== cat) return false;
      if (marca !== 'todas' && p.marca !== marca) return false;
      if (talla !== 'todas' && p.talla !== talla) return false;
      if (estado !== 'todas' && p.estado !== estado) return false;
      if (q) {
        const texto = [p.marca, p.modelo, p.talla, p.categoria, p.titular]
          .filter(Boolean).join(' ').toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });

    const peso = p => (p.estado === 'vendida' ? 1 : 0);
    if (orden === 'precio-asc') lista.sort((a, b) => peso(a) - peso(b) || (a.precio || 0) - (b.precio || 0));
    else if (orden === 'precio-desc') lista.sort((a, b) => peso(a) - peso(b) || (b.precio || 0) - (a.precio || 0));
    else lista.sort((a, b) => peso(a) - peso(b) || String(b.fecha || '').localeCompare(String(a.fecha || '')));

    rejilla.innerHTML = lista.map(tarjeta).join('');
    el('vacio').hidden = lista.length > 0;
    el('contador').textContent =
      `${lista.length} ${lista.length === 1 ? 'artículo' : 'artículos'}`;
  }

  async function iniciar() {
    el('anio').textContent = new Date().getFullYear();

    try {
      const res = await fetch('data/productos.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const datos = await res.json();
      PRODUCTOS = Array.isArray(datos) ? datos : (datos.productos ?? []);
    } catch (e) {
      console.error('EquiSelection · error al cargar el catálogo:', e);
      rejilla.innerHTML = '<p class="vacio">No se ha podido cargar el catálogo.</p>';
      return;
    }

    rellenarSelect(el('f-categoria'), unicos('categoria'), 'Todas las categorías');
    rellenarSelect(el('f-marca'), unicos('marca'), 'Todas las marcas');
    rellenarSelect(el('f-talla'), unicos('talla'), 'Todas las tallas');

    const form = el('filtros');
    form.addEventListener('submit', e => e.preventDefault());  // Enter no recarga
    form.addEventListener('input', aplicar);
    form.addEventListener('change', aplicar);

    el('f-reset').addEventListener('click', () => {
      el('f-busqueda').value = '';
      el('f-categoria').value = 'todas';
      el('f-marca').value = 'todas';
      el('f-talla').value = 'todas';
      el('f-estado').value = 'todas';
      el('f-orden').value = 'recientes';
      aplicar();
    });

    aplicar();
  }

  iniciar();
})();

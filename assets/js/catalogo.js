(() => {
  const EUR = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  });

  const el = id => document.getElementById(id);
  const rejilla = el('rejilla');
  let PRODUCTOS = [];

  const estadoTexto = { disponible:'', reservada:'Reservada', vendida:'Vendida' };

  function rellenarSelect(select, valores, etiquetaTodas) {
    select.innerHTML = `<option value="todas">${etiquetaTodas}</option>` +
      valores.map(v => `<option value="${v}">${v}</option>`).join('');
  }

  function unicos(campo) {
    return [...new Set(PRODUCTOS.map(p => p[campo]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  }

  function tarjeta(p) {
    const vendida = p.estado === 'vendida';
    let etiqueta = '';
    if (vendida) etiqueta = '<span class="etiqueta etiqueta--vendida">Vendida</span>';
    else if (p.estado === 'reservada') etiqueta = '<span class="etiqueta etiqueta--reservada">Reservada</span>';
    else if (p.novedad) etiqueta = '<span class="etiqueta etiqueta--nueva">Nueva entrada</span>';

    return `
      <a class="tarjeta ${vendida ? 'tarjeta--vendida' : ''}" href="montura.html?id=${encodeURIComponent(p.id)}">
        <div class="tarjeta__marco">
          ${etiqueta}
          <img src="${p.fotos?.[0] ?? ''}" alt="${p.marca} ${p.modelo}" loading="lazy">
        </div>
        <div class="tarjeta__cuerpo">
          <p class="tarjeta__categoria">${p.categoria ?? ''}</p>
          <h3 class="tarjeta__titulo">${p.marca ?? ''}</h3>
          <p class="tarjeta__modelo">${p.modelo ?? ''}</p>
          <div class="tarjeta__pie">
            <span class="tarjeta__precio">${vendida ? '—' : EUR.format(p.precio)}</span>
            <span class="tarjeta__talla">${p.talla ?? ''}</span>
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

    let lista = PRODUCTOS.filter(p => {
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
    if (orden === 'precio-asc') lista.sort((a,b) => peso(a)-peso(b) || a.precio-b.precio);
    else if (orden === 'precio-desc') lista.sort((a,b) => peso(a)-peso(b) || b.precio-a.precio);
    else lista.sort((a,b) => peso(a)-peso(b) || String(b.fecha).localeCompare(String(a.fecha)));

    rejilla.innerHTML = lista.map(tarjeta).join('');
    el('vacio').hidden = lista.length > 0;
    el('contador').textContent =
      `${lista.length} ${lista.length === 1 ? 'artículo' : 'artículos'}`;
  }

  async function iniciar() {
    el('anio').textContent = new Date().getFullYear();
    try {
      const res = await fetch('data/productos.json', { cache: 'no-store' });
      PRODUCTOS = (await res.json()).productos ?? [];
    } catch (e) {
      rejilla.innerHTML = '<p class="vacio">No se ha podido cargar el catálogo.</p>';
      return;
    }

    rellenarSelect(el('f-categoria'), unicos('categoria'), 'Todas las categorías');
    rellenarSelect(el('f-marca'), unicos('marca'), 'Todas las marcas');
    rellenarSelect(el('f-talla'), unicos('talla'), 'Todas las tallas');

    el('filtros').addEventListener('input', aplicar);
    el('filtros').addEventListener('change', aplicar);
    el('f-reset').addEventListener('click', () => {
      el('filtros').reset();
      el('f-categoria').value = el('f-marca').value = el('f-talla').value = 'todas';
      el('f-estado').value = 'todas';
      el('f-orden').value = 'recientes';
      aplicar();
    });

    aplicar();
  }

  iniciar();
})();

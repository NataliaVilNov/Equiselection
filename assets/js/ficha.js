(() => {
  const EUR = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  });
  const CONTACTO = {
    whatsapp: '34600000000',
    email: 'hola@equiselection.viles.es'
  };
  const contenedor = document.getElementById('ficha');

  function pintar(p) {
    document.title = `${p.marca} ${p.modelo} · EquiSelection`;
    const vendida = p.estado === 'vendida';
    const fotos = p.fotos ?? [];

    const specs = (p.especificaciones ?? [])
      .map(s => `<tr><th>${s.etiqueta}</th><td>${s.valor}</td></tr>`).join('');

    const miniaturas = fotos.length > 1 ? `
      <div class="galeria__miniaturas">
        ${fotos.map((f,i) => `
          <button type="button" data-foto="${f}" aria-current="${i===0}">
            <img src="${f}" alt="" loading="lazy">
          </button>`).join('')}
      </div>` : '';

    const disponibilidad = vendida ? 'Vendida · ya tiene nuevo jinete'
      : p.estado === 'reservada' ? 'Reservada'
      : 'Disponible · unidad única';

    const comprar = (!vendida && p.checkoutUrl)
      ? `<a class="boton boton--oscuro" href="${p.checkoutUrl}" rel="noopener">Comprar</a>` : '';

    const consulta = encodeURIComponent(
      `Hola, me interesa la ${p.marca} ${p.modelo} ${p.talla ?? ''} publicada en la web.`);

    const acciones = vendida ? `
      <a class="boton boton--linea" href="index.html#catalogo">Ver disponibles</a>` : `
      ${comprar}
      <a class="boton ${comprar ? 'boton--linea' : 'boton--oscuro'}"
         href="https://wa.me/${CONTACTO.whatsapp}?text=${consulta}" rel="noopener">Consultar por WhatsApp</a>
      <a class="boton boton--linea" href="mailto:${CONTACTO.email}?subject=${encodeURIComponent(p.marca+' '+p.modelo)}">Escribir un correo</a>`;

    contenedor.innerHTML = `
      <a class="ficha__volver" href="index.html#catalogo">← Volver al catálogo</a>
      <div class="ficha__grid">
        <div>
          <div class="galeria__principal">
            <img id="foto-principal" src="${fotos[0] ?? ''}" alt="${p.marca} ${p.modelo}">
          </div>
          ${miniaturas}
        </div>
        <div>
          <p class="ficha__categoria">${p.categoria ?? ''}</p>
          <h1 class="ficha__titulo">${p.marca ?? ''}</h1>
          <p class="ficha__modelo">${p.modelo ?? ''} ${p.talla ? '· ' + p.talla : ''}</p>
          <p class="ficha__precio">${vendida ? '—' : EUR.format(p.precio)}</p>
          <p class="ficha__disponibilidad">${disponibilidad}</p>
          <p class="ficha__descripcion">${p.descripcion ?? ''}</p>
          <table class="tabla-specs"><tbody>${specs}</tbody></table>
          <div class="ficha__acciones">${acciones}</div>
        </div>
      </div>`;

    contenedor.querySelectorAll('.galeria__miniaturas button').forEach(b => {
      b.addEventListener('click', () => {
        document.getElementById('foto-principal').src = b.dataset.foto;
        contenedor.querySelectorAll('.galeria__miniaturas button')
          .forEach(x => x.setAttribute('aria-current', x === b));
      });
    });
  }

  (async () => {
    document.getElementById('anio').textContent = new Date().getFullYear();
    const id = new URLSearchParams(location.search).get('id');
    try {
      const res = await fetch('data/productos.json', { cache: 'no-store' });
      const p = ((await res.json()).productos ?? []).find(x => x.id === id);
      if (!p) throw new Error('no encontrado');
      pintar(p);
    } catch {
      contenedor.innerHTML =
        '<p class="cargando">Artículo no encontrado. <a href="index.html#catalogo">Volver al catálogo</a></p>';
    }
  })();
})();

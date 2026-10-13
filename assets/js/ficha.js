(() => {
  const EUR = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  });

  // Deja whatsapp vacío mientras no tengas la línea: el botón no aparecerá.
  const CONTACTO = {
    whatsapp: '',
    email: 'hola@equiselection.viles.es'
  };

  const ruta = f => String(f || '').replace(/^\//, '');
  const esc = s => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const contenedor = document.getElementById('ficha');

  function pintar(p) {
    document.title = `${p.marca ?? ''} ${p.modelo ?? ''} · EquiSelection`;

    const vendida = p.estado === 'vendida';
    const fotos = (p.fotos ?? []).map(ruta).filter(Boolean);

    const specs = (p.especificaciones ?? [])
      .map(s => `<tr><th>${esc(s.etiqueta)}</th><td>${esc(s.valor)}</td></tr>`).join('');

    const principal = fotos[0]
      ? `<img id="foto-principal" src="${esc(fotos[0])}" alt="${esc(p.marca)} ${esc(p.modelo)}">`
      : `<div class="sin-foto"><img src="assets/img/isotipo.png" alt=""></div>`;

    const miniaturas = fotos.length > 1 ? `
      <div class="galeria__miniaturas">
        ${fotos.map((f, i) => `
          <button type="button" data-foto="${esc(f)}" aria-current="${i === 0}">
            <img src="${esc(f)}" alt="" loading="lazy">
          </button>`).join('')}
      </div>` : '';

    const disponibilidad = vendida ? 'Vendida · ya tiene nuevo jinete'
      : p.estado === 'reservada' ? 'Reservada'
      : 'Disponible · unidad única';

    const comprar = (!vendida && p.checkoutUrl)
      ? `<a class="boton boton--oscuro" href="${esc(p.checkoutUrl)}" rel="noopener">Comprar</a>` : '';

    const consulta = encodeURIComponent(
      `Hola, me interesa la ${p.marca ?? ''} ${p.modelo ?? ''} ${p.talla ?? ''} publicada en la web.`);

    const botonWhatsapp = CONTACTO.whatsapp
      ? `<a class="boton ${comprar ? 'boton--linea' : 'boton--oscuro'}"
            href="https://wa.me/${CONTACTO.whatsapp}?text=${consulta}" rel="noopener">Consultar por WhatsApp</a>`
      : '';

    const botonEmail = `<a class="boton ${(comprar || botonWhatsapp) ? 'boton--linea' : 'boton--oscuro'}"
         href="mailto:${CONTACTO.email}?subject=${encodeURIComponent((p.marca ?? '') + ' ' + (p.modelo ?? ''))}">Escribir un correo</a>`;

    const acciones = vendida
      ? `<a class="boton boton--linea" href="index.html#catalogo">Ver disponibles</a>`
      : `${comprar}${botonWhatsapp}${botonEmail}`;

    contenedor.innerHTML = `
      <a class="ficha__volver" href="index.html#catalogo">← Volver al catálogo</a>
      <div class="ficha__grid">
        <div>
          <div class="galeria__principal">${principal}</div>
          ${miniaturas}
        </div>
        <div>
          <p class="ficha__categoria">${esc(p.categoria)}</p>
          <h1 class="ficha__titulo">${esc(p.marca)}</h1>
          <p class="ficha__modelo">${esc(p.modelo)} ${p.talla ? '· ' + esc(p.talla) : ''}</p>
          <p class="ficha__precio">${vendida ? '—' : EUR.format(p.precio || 0)}</p>
          <p class="ficha__disponibilidad">${disponibilidad}</p>
          <p class="ficha__descripcion">${esc(p.descripcion)}</p>
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
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const datos = await res.json();
      const lista = Array.isArray(datos) ? datos : (datos.productos ?? []);
      const p = lista.find(x => x.id === id);
      if (!p) throw new Error('no encontrado');
      pintar(p);
    } catch (e) {
      console.error('EquiSelection · error en la ficha:', e);
      contenedor.innerHTML =
        '<p class="cargando">Artículo no encontrado. <a href="index.html#catalogo">Volver al catálogo</a></p>';
    }
  })();
})();

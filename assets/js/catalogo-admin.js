import { connect, productsFrom } from './admin-github.js';

const catalog = document.getElementById('catalogo');
const grid = document.getElementById('rejilla');
const active = new URLSearchParams(location.search).get('admin') === '1';

if (active) setup();

function setup() {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'assets/css/catalogo-admin.css';
  document.head.append(style);
  const controls = document.createElement('div');
  controls.className = 'admin-controls';
  controls.innerHTML = `
    <button type="button" data-login>Entrar como administradora</button>
    <button type="button" data-add hidden><strong aria-hidden="true">+</strong> Publicar artículo</button>
    <button type="button" data-logout hidden>Cerrar sesión</button>
    <p role="status"></p>`;
  catalog.querySelector('.seccion__encabezado').after(controls);
  const login = controls.querySelector('[data-login]');
  const add = controls.querySelector('[data-add]');
  const logout = controls.querySelector('[data-logout]');
  const status = controls.querySelector('[role=status]');
  let github;
  let products = [];
  let publicProducts;
  const previews = new Map();

  function render() {
    login.hidden = !!github;
    add.hidden = logout.hidden = !github;
    grid.dispatchEvent(new CustomEvent('catalogo:admin', {
      detail: { enabled: !!github, products: github ? products : publicProducts, previews }
    }));
  }

  login.addEventListener('click', () => {
    const dialog = modal('Administración del catálogo', `
      <label>Credencial de GitHub<input name="token" type="password" required autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <p>Usa un token de acceso limitado a Equiselection, con permiso de lectura y escritura en Contenidos.
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Crear credencial</a>
      </p>`, 'Entrar');
    submit(dialog, async form => {
      const connection = connect(form.elements.token.value.trim());
      form.elements.token.value = '';
      const { data } = await connection.load();
      if (!publicProducts) {
        const response = await fetch('data/productos.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo cargar el catálogo público.');
        publicProducts = productsFrom(await response.json());
      }
      github = connection;
      products = productsFrom(data);
      render();
      add.focus();
    });
  });

  logout.addEventListener('click', () => {
    github = undefined;
    products = [];
    for (const url of previews.values()) URL.revokeObjectURL(url);
    previews.clear();
    status.textContent = '';
    render();
    login.focus();
  });

  add.addEventListener('click', () => edit());
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-admin-edit]');
    if (!button || !github) return;
    button.closest('details').open = false;
    const product = products.find(item => item.id === button.dataset.adminEdit);
    if (product) edit(product);
  });

  function edit(original) {
    const dialog = modal(original ? 'Editar artículo' : 'Publicar artículo', `
      <div class="admin-fields">
        <label>Marca<input name="marca" required maxlength="100"></label>
        <label>Modelo<input name="modelo" required maxlength="100"></label>
        <label>Talla<input name="talla"></label>
        <label>Precio (€)<input name="precio" type="number" min="0" step="0.01" inputmode="decimal"></label>
        <label>Categoría<select name="categoria"><option>Monturas</option><option>Equipación</option><option>Accesorios</option></select></label>
        <label>Disponibilidad<select name="estado"><option value="disponible">Disponible</option><option value="reservada">Reservada</option><option value="vendida">Vendida</option></select></label>
      </div>
      <label>Titular<input name="titular"></label>
      <label>Descripción<textarea name="descripcion" rows="4"></textarea></label>
      <section aria-label="Fotos">
        <label>Añadir fotos<input type="file" accept="image/*" multiple data-photos></label>
        <p>Hasta 10 fotos. La primera será la portada.</p>
        <ol class="admin-photos"></ol>
      </section>
      <details class="admin-extra">
        <summary>Más detalles</summary>
        <label>Fecha de publicación<input name="fecha" type="date"></label>
        <label><input name="novedad" type="checkbox"> Nueva entrada</label>
        <label><input name="destacado" type="checkbox"> Destacada</label>
        <label>Enlace de pago<input name="checkoutUrl" type="url"></label>
        <div data-specs></div>
        <button type="button" data-add-spec>Añadir especificación</button>
      </details>`, original ? 'Guardar cambios' : 'Publicar');

    const form = dialog.querySelector('form');
    const fields = ['marca', 'modelo', 'talla', 'categoria', 'estado', 'titular', 'descripcion', 'fecha', 'checkoutUrl'];
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const defaults = { categoria: 'Monturas', estado: 'disponible', fecha: today };
    for (const name of fields) form.elements[name].value = (original ?? defaults)[name] ?? '';
    for (const name of ['categoria', 'estado']) {
      const select = form.elements[name];
      if (!select.value && original?.[name]) select.add(new Option(original[name], original[name], true, true));
    }
    form.elements.precio.value = original?.precio ?? '';
    form.elements.novedad.checked = original?.novedad ?? !original;
    form.elements.destacado.checked = !!original?.destacado;

    const specs = form.querySelector('[data-specs]');
    function addSpec(spec = {}) {
      const row = document.createElement('div');
      row.className = 'admin-spec';
      row.innerHTML = '<label>Concepto<input required></label><label>Valor<input required></label><button type="button" aria-label="Quitar especificación">×</button>';
      const [label, value] = row.querySelectorAll('input');
      label.value = spec.etiqueta ?? '';
      value.value = spec.valor ?? '';
      row.querySelector('button').onclick = () => row.remove();
      specs.append(row);
      return label;
    }
    for (const spec of original?.especificaciones ?? []) addSpec(spec);
    form.querySelector('[data-add-spec]').onclick = () => addSpec().focus();

    const photos = (original?.fotos ?? []).map(path => ({ path, url: previews.get(path) || path.replace(/^\//, '') }));
    const photoList = form.querySelector('.admin-photos');
    const picker = form.querySelector('[data-photos]');
    const message = form.querySelector('[role=alert]');
    function drawPhotos() {
      photoList.replaceChildren();
      photos.forEach((photo, index) => {
        const row = document.createElement('li');
        row.innerHTML = '<img alt=""><button type="button">Hacer portada</button><button type="button">Quitar</button>';
        row.querySelector('img').src = photo.url;
        const [cover, remove] = row.querySelectorAll('button');
        cover.textContent = index === 0 ? 'Portada' : 'Hacer portada';
        cover.disabled = index === 0;
        cover.onclick = () => {
          photos.unshift(...photos.splice(index, 1));
          drawPhotos();
          photoList.querySelector('button:last-child')?.focus();
        };
        remove.setAttribute('aria-label', 'Quitar foto ' + (index + 1));
        remove.onclick = () => {
          photos.splice(index, 1);
          if (photo.blob) URL.revokeObjectURL(photo.url);
          drawPhotos();
          picker.focus();
        };
        photoList.append(row);
      });
    }

    picker.addEventListener('change', async () => {
      const files = [...picker.files];
      picker.value = '';
      message.textContent = '';
      if (photos.length + files.length > 10) {
        message.textContent = 'Puedes añadir hasta 10 fotos en total.';
        return;
      }
      form.querySelector('fieldset').disabled = true;
      try {
        for (const file of files) {
          try {
            const blob = await resizePhoto(file);
            photos.push({ blob, url: URL.createObjectURL(blob), path: '/assets/img/productos/' + crypto.randomUUID() + '.jpg' });
          } catch {
            message.textContent = 'Alguna foto no se pudo abrir. Prueba con una imagen JPG o PNG.';
          }
        }
      } finally {
        drawPhotos();
        form.querySelector('fieldset').disabled = false;
      }
    });
    drawPhotos();
    dialog.addEventListener('close', () => {
      for (const photo of photos) {
        if (photo.blob && !previews.has(photo.path)) URL.revokeObjectURL(photo.url);
      }
    });

    const id = original?.id ?? crypto.randomUUID();
    submit(dialog, async () => {
      if (!original && !photos.length) throw new Error('Añade al menos una foto.');
      const product = { ...original, id };
      for (const name of fields) product[name] = form.elements[name].value.trim();
      if (!product.marca || !product.modelo) throw new Error('Escribe una marca y un modelo.');
      if (product.checkoutUrl && !/^https:\/\//i.test(product.checkoutUrl)) {
        throw new Error('El enlace de pago debe empezar por https://.');
      }
      const price = form.elements.precio.value;
      if (price === '') delete product.precio;
      else product.precio = Number(price);
      product.novedad = form.elements.novedad.checked;
      product.destacado = form.elements.destacado.checked;
      product.especificaciones = [...specs.children].map(row => {
        const [label, value] = row.querySelectorAll('input');
        return { etiqueta: label.value.trim(), valor: value.value.trim() };
      });
      product.fotos = photos.map(photo => photo.path);
      const uploads = photos.filter(photo => photo.blob);
      try {
        products = await github.save(original, product, uploads.map(photo => ({
          path: photo.path.slice(1), blob: photo.blob
        })));
      } catch (error) {
        const { data } = await github.load().catch(() => ({}));
        if (data) {
          products = productsFrom(data);
          render();
        }
        throw error;
      }
      for (const photo of uploads) previews.set(photo.path, photo.url);
      render();
      status.textContent = 'Guardado en GitHub. La web pública se actualizará cuando termine el despliegue.';
      add.focus();
    });
  }
}

function modal(title, content, action) {
  const dialog = document.createElement('dialog');
  dialog.className = 'admin-editor';
  dialog.setAttribute('aria-labelledby', 'admin-heading');
  dialog.innerHTML = `<form><fieldset>
    <header><h2 id="admin-heading">${title}</h2><button type="button" data-close aria-label="Cerrar">×</button></header>
    <div class="admin-body">${content}</div>
    <footer><p role="alert"></p><button type="submit">${action}</button></footer>
  </fieldset></form>`;
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('cancel', event => {
    if (dialog.querySelector('fieldset').disabled) event.preventDefault();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

function submit(dialog, handler) {
  const form = dialog.querySelector('form');
  const fieldset = form.querySelector('fieldset');
  const message = form.querySelector('[role=alert]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (fieldset.disabled) return;
    if (!form.reportValidity()) return;
    fieldset.disabled = true;
    message.textContent = 'Un momento…';
    try {
      await handler(form);
      dialog.close();
    } catch (error) {
      message.textContent = error.message || 'No se pudo completar la operación.';
    } finally {
      fieldset.disabled = false;
    }
  });
}

async function resizePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
    if (!blob) throw new Error('No se pudo preparar la foto.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

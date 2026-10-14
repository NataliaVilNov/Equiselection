(() => {
  const cabecera = document.querySelector('.cabecera');
  const boton = document.getElementById('menu-toggle');
  if (!cabecera || !boton) return;

  const cerrar = () => {
    cabecera.classList.remove('cabecera--abierta');
    boton.setAttribute('aria-expanded', 'false');
  };

  boton.addEventListener('click', () => {
    const abierta = cabecera.classList.toggle('cabecera--abierta');
    boton.setAttribute('aria-expanded', abierta);
  });

  // Al elegir destino, el menú se retira solo
  cabecera.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', cerrar));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
})();

const owner = 'NataliaVilNov';
const name = 'Equiselection';
const branch = 'main';
const catalogPath = 'data/productos.json';

export function productsFrom(data) {
  const products = Array.isArray(data) ? data : data?.productos;
  if (!Array.isArray(products)) throw new Error('El formato del catálogo no es válido.');
  return products;
}

export function applyProduct(data, original, product) {
  const products = [...productsFrom(data)];
  const index = products.findIndex(item => item.id === product.id);
  if (original) {
    if (index < 0 || JSON.stringify(products[index]) !== JSON.stringify(original)) {
      throw new Error('Esta ficha ha cambiado en GitHub. Cierra el editor y vuelve a abrirla.');
    }
    products[index] = product;
  } else {
    if (index >= 0) throw new Error('Ya existe una ficha con ese identificador.');
    products.push(product);
  }
  return Array.isArray(data) ? products : { ...data, productos: products };
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    reader.onerror = () => reject(new Error('No se pudo leer uno de los archivos.'));
    reader.readAsDataURL(blob);
  });
}

export function connect(token) {
  async function graphql(query, variables) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(90000)
    });
    if (response.status === 401) throw new Error('La credencial de GitHub no es válida o ha caducado.');
    if (!response.ok) throw new Error('GitHub no pudo procesar la solicitud (' + response.status + ').');
    const { data, errors } = await response.json();
    if (errors?.length) {
      if (errors.some(error => error.type === 'STALE_DATA' || /expected.*(head|oid)/i.test(error.message))) {
        throw new Error('El catálogo ha cambiado mientras guardabas. Vuelve a intentarlo.');
      }
      if (errors.some(error => error.type === 'FORBIDDEN')) {
        throw new Error('GitHub ha denegado el acceso. Revisa el permiso de escritura en Contenidos.');
      }
      throw new Error('GitHub no pudo completar la operación. Comprueba los permisos y el estado del repositorio.');
    }
    return data;
  }

  const identity = { owner, name, ref: 'refs/heads/' + branch };
  async function load() {
    const { repository } = await graphql(`query($owner:String!, $name:String!, $ref:String!) {
      repository(owner:$owner, name:$name) {
        viewerPermission
        ref(qualifiedName:$ref) { target { oid } }
      }
    }`, identity);
    if (!['ADMIN', 'MAINTAIN', 'WRITE'].includes(repository?.viewerPermission)) {
      throw new Error('Esta cuenta no tiene acceso de administración al catálogo.');
    }
    const head = repository.ref?.target?.oid;
    if (!head) throw new Error('No se encuentra la rama del catálogo.');
    const result = await graphql(`query($owner:String!, $name:String!, $path:String!) {
      repository(owner:$owner,name:$name) {
        object(expression:$path) { ... on Blob { text isTruncated } }
      }
    }`, { owner, name, path: head + ':' + catalogPath });
    const file = result.repository?.object;
    if (!file?.text || file.isTruncated) throw new Error('No se pudo leer el catálogo completo.');
    const data = JSON.parse(file.text);
    productsFrom(data);
    return { head, data };
  }

  async function save(original, product, photos) {
    const { head, data } = await load();
    const updated = applyProduct(data, original, product);
    const additions = await Promise.all([
      { path: catalogPath, blob: new Blob([JSON.stringify(updated, null, 2) + '\n']) },
      ...photos
    ].map(async ({ path, blob }) => ({ path, contents: await toBase64(blob) })));
    const result = await graphql(`mutation($input:CreateCommitOnBranchInput!) {
      createCommitOnBranch(input:$input) { commit { oid } }
    }`, { input: {
      branch: { repositoryNameWithOwner: owner + '/' + name, refName: branch },
      expectedHeadOid: head,
      message: { headline: (original ? 'Editar ' : 'Publicar ') + product.id },
      fileChanges: { additions }
    } });
    if (!result.createCommitOnBranch?.commit?.oid) throw new Error('GitHub no confirmó la publicación.');
    return productsFrom(updated);
  }
  return { load, save };
}

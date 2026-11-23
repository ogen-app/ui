import type { Translation } from '../en'

export const workspaces: Translation['workspaces'] = {
  title: 'Tus espacios',
  loadFailed: 'No se han podido cargar tus espacios.',
  create: 'NUEVO ESPACIO',
  current: 'Actual',
  memberCount_one: '{{count}} miembro',
  memberCount_other: '{{count}} miembros',
  loggedInAs: 'Sesión iniciada como',
  wrongAccount: '¿Cuenta equivocada?',
  logOut: 'Cerrar sesión',
  switchFailed: 'No se ha podido cambiar de espacio',
  createDialog: {
    title: 'Nuevo espacio',
    body: 'Un espacio tiene sus propias campañas, contenido y cuentas conectadas — incluidas sus propias cuentas sociales, así que un segundo espacio es la forma de llevar otra página de LinkedIn o Facebook junto a esta.',
    nameLabel: 'Nombre',
    namePlaceholder: 'Cliente Northwind',
    cancel: 'Cancelar',
    createOnly: 'Solo crear',
    createAndSwitch: 'Crear y cambiar',
    created: '{{name}} creado',
    createdNote: 'Cambia a él desde el menú de espacios cuando lo necesites.',
    createFailed: 'No se ha podido crear el espacio',
    workspaceLimit:
      'Has alcanzado el número de espacios disponibles durante la beta.',
  },
}

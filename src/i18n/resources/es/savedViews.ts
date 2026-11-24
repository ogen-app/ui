import type { Translation } from '../en'

/** Smart groups — saved filters of a list (CON-388 §5, CON-392). */
export const savedViews: Translation['savedViews'] = {
  all: {
    ideas: 'Todas las ideas',
    assets: 'Todos los recursos',
  },
  groups: 'Grupos inteligentes',
  shared: 'Compartido con el espacio de trabajo',
  menu: 'Acciones de «{{name}}»',
  rename: 'Renombrar',
  share: 'Compartir con el espacio de trabajo',
  unshare: 'Dejar de compartir',
  duplicate: 'Duplicar',
  views: 'Vistas',
  close: 'Cerrar «{{name}}»',
  delete: 'Eliminar',
  copyName: '{{name}} (copia)',
  edited: 'modificado',
  invalid: 'El filtro de este grupo ya no funciona.',
  saveAs: 'Guardar como grupo',
  saveCurrent: 'Guardar el filtro actual como grupo',
  trigger: 'Vistas: {{name}}',
  emptyMenu: 'Filtra la lista y guárdala aquí como grupo.',
  saveChanges: 'Guardar cambios',
  saveAsNew: 'Guardar como nuevo…',
  revert: 'Deshacer cambios',
  saved: 'Se guardó «{{name}}».',
  save: {
    title: 'Guardar como grupo inteligente',
    renameTitle: 'Renombrar el grupo',
    name: 'Nombre',
    share: 'Compartir con el espacio de trabajo',
    what: 'Guarda los filtros, la agrupación y el orden, no lo que encuentran.',
    cancel: 'Cancelar',
    confirm: 'Guardar grupo',
    renameConfirm: 'Guardar',
  },
  remove: {
    title: '¿Eliminar «{{name}}»?',
    body: 'Se elimina el grupo; no se borra nada de lo que muestra.',
    bodyShared:
      'Se elimina el grupo para todos con quienes se comparte; no se borra nada de lo que muestra.',
    keep: 'Conservar grupo',
    confirm: 'Eliminar grupo',
  },
}

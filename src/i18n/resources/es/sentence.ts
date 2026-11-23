import type { Translation } from '../en'

/** The filter sentence's own chrome, shared by every list (CON-391/392). */
export const sentence: Translation['sentence'] = {
  label: 'Filtro',
  addDetail: 'añadir un detalle',
  add: 'Añadir',
  addPlaceholder: 'un detalle…',
  change: 'Cambiar: {{clause}}',
  remove: 'Quitar: {{clause}}',
  removeDetail: 'Quitar este detalle',
  done: 'Hecho',
  clear: 'Borrar',
  clearAll: 'Quitar filtros',
  more: '+{{formatted}}',
  removeLast: 'quitar el último detalle',
  noValues: 'Aún no hay nada que elegir',
  heading: {
    search: 'Buscar',
    narrow: 'O acotar por',
    add: 'Añadir un detalle',
  },
}

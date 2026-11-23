import type { Translation } from '../en'

export const workspace: Translation['workspace'] = {
  role: {
    owner: 'Propietario',
    member: 'Miembro',
  },
  ability: {
    owner:
      'Puede invitar personas, cambiar roles, conectar cuentas y renombrar el espacio.',
    member:
      'Puede planificar, escribir y publicar contenido, pero no gestionar el espacio ni a su gente.',
  },
}

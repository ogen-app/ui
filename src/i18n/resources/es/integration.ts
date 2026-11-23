import type { Translation } from '../en'

export const integration: Translation['integration'] = {
  rateLimited: 'Demasiados intentos — vuelve a intentarlo en un momento.',
  rateLimitedIn: 'Demasiados intentos — vuelve a intentarlo en {{seconds}} s.',
  disabled:
    'La integración de publicación no está configurada en este servidor.',
  degraded:
    'La integración de publicación no está disponible temporalmente. Inténtalo de nuevo en un momento.',
  alreadyDisconnected: 'Esta cuenta ya está desconectada.',
  removalUnconfirmed:
    'El proveedor de publicación no ha confirmado la eliminación, así que no se ha cambiado nada. Inténtalo de nuevo en un momento.',
}

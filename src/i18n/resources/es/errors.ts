import type { Translation } from '../en'

export const errors: Translation['errors'] = {
  notFound: {
    code: '404',
    title: 'Página no encontrada',
    message: 'La página que buscas no existe o se ha movido.',
    type: 'NO ENCONTRADA',
    home: 'Ir al inicio',
  },
  serverUnavailable: {
    code: '503',
    title: 'No se puede contactar con el servidor',
    message: 'La aplicación no puede conectarse al servidor ahora mismo.',
    messageSecondLine:
      'Puede que se esté reiniciando o que esté temporalmente sin servicio.',
    type: 'SIN CONEXIÓN',
  },
  crash: {
    code: '500',
    title: 'Algo salió mal',
    message:
      'La aplicación tuvo un error inesperado. Recargar suele solucionarlo.',
    type: 'ERROR',
    reload: 'Recargar',
  },
}

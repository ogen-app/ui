import type { Translation } from '../en'

export const help: Translation['help'] = {
  title: 'Ayuda',
  back: 'Atrás',
  related: 'Relacionado',
  trigger: {
    label: '¿Qué es esto?',
  },
  empty: {
    failed: {
      title: 'No se pudo cargar la ayuda',
      body: 'Comprueba tu conexión e inténtalo de nuevo.',
      retry: 'REINTENTAR',
    },
    none: {
      title: 'Todavía no hay ayuda para esta página',
      body: 'Aún la estamos escribiendo. Mientras tanto, Ogen puede explicarte cualquier cosa de esta pantalla.',
    },
    notFound: {
      title: 'Este artículo no está aquí',
      body: 'Puede que se haya renombrado o retirado. Ogen puede responder a tu pregunta.',
    },
    askOgen: 'PREGUNTAR A OGEN',
  },
  embed: {
    open: 'Abrir',
    openLabel: 'Abrir «{{title}}» por separado',
  },
  untranslated: 'Este artículo todavía no está disponible en tu idioma.',
}

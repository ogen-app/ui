import type { Translation } from '../en'

export const postsTable: Translation['postsTable'] = {
  sortSaveFailed: 'No se ha podido guardar el orden que has elegido',
  view: {
    groupBy: 'Agrupar por',
    groupByHeading: 'AGRUPAR POR',
    group: {
      status: 'Estado',
      campaign: 'Campaña',
      none: 'Sin agrupar',
    },
    fold: 'Plegar {{group}}',
    unfold: 'Desplegar {{group}}',
  },

  columnTitle: 'Título',
  columnStatus: 'Estado',
  columnWarnings: 'Avisos',
  columnPlatform: 'Plataforma',
  columnFormat: 'Formato',
  columnCampaign: 'Campaña',
  columnSeries: 'Serie',
  columnPublishDate: 'Fecha de publicación',
  columnWhen: 'Cuándo',

  notSet: 'Sin programar',

  noPosts: 'No hay publicaciones',

  selectAll: 'Seleccionar todas las publicaciones',
  selectAllCount_one: 'Seleccionar la {{formatted}} publicación',
  selectAllCount_other: 'Seleccionar las {{formatted}} publicaciones',
  selectAllMatching_one: 'Seleccionar la {{formatted}} publicación coincidente',
  selectAllMatching_other:
    'Seleccionar las {{formatted}} publicaciones coincidentes',
  clearSelection: 'Borrar la selección',
  selectPost: 'Seleccionar {{title}}',

  today: 'Hoy',
  tomorrow: 'Mañana',
  yesterday: 'Ayer',
  inDays_one: 'Dentro de {{count}} día',
  inDays_other: 'Dentro de {{count}} días',
  daysAgo_one: 'Hace {{count}} día',
  daysAgo_other: 'Hace {{count}} días',

  warnings: {
    open_one: '{{formatted}} aviso en {{title}}',
    open_other: '{{formatted}} avisos en {{title}}',
    panelTitle: 'Avisos',
    openPost: 'Abrir publicación',
    none: 'Ya no hay nada que corregir en esta publicación.',
    kind: {
      failed: {
        title: 'No se pudo publicar',
        detail:
          'La plataforma la rechazó. Abre la publicación para ver por qué y vuelve a intentarlo.',
      },
      missed: {
        title: 'Se pasó la fecha',
        detail:
          'Su hora de publicación pasó sin que saliera. Dale una fecha nueva.',
      },
      noPlatform: {
        title: 'Sin plataforma',
        detail: 'Elige dónde se publica antes de poder programarla.',
      },
      noAccount: {
        title: 'Ninguna cuenta conectada',
        detail:
          'No hay nada conectado para su plataforma. Conecta una cuenta en Ajustes del espacio.',
      },
      chooseAccount: {
        title: 'Elige una cuenta',
        detail:
          'Hay más de una cuenta conectada para su plataforma. Elige con cuál se publica.',
      },
      accountGone: {
        title: 'Cuenta desconectada',
        detail:
          'La cuenta con la que iba a publicarse ya no está conectada. Elige otra.',
      },
      outsidePlatform: {
        title: 'No es una plataforma de esta campaña',
        detail:
          'La campaña ya no usa esta plataforma. Mueve la publicación o vuelve a añadir la plataforma a la campaña.',
      },
      outsidePostType: {
        title: 'No es un tipo de publicación de esta campaña',
        detail:
          'La campaña ya no admite este tipo de publicación en esta plataforma. Elige otro tipo.',
      },
      notGrounded: {
        title: 'Escrita sin fuentes',
        detail:
          'Se generó a partir de conocimiento general, no del material propio de la campaña.',
      },
    },
  },

  chooseCampaign: {
    title: '¿A qué campaña añades la publicación?',
    description:
      'Una publicación pertenece a una sola campaña. Elige dónde va esta.',
  },
}

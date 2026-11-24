import type { Translation } from '../en'

export const campaigns: Translation['campaigns'] = {
  accounts: {
    groups: {
      available_other: 'Cuentas disponibles',
      available_one: 'Cuenta disponible',
      inactive: 'Inactivas',
      active: 'Activas',
    },
    use: 'Usar',
    activate: 'Activar',
  },
  platforms: {
    deactivateAll: 'Desactivar todas',
  },
  create: {
    submit: 'Crear campaña',
  },
  bulk: {
    selected_one: '{{formatted}} seleccionada',
    selected_other: '{{formatted}} seleccionadas',
    allMatching_one: 'Seleccionada la {{formatted}} publicación que coincide',
    allMatching_other:
      'Seleccionadas las {{formatted}} publicaciones que coinciden',
    when: 'Fecha y hora de publicación',
    changeDate: 'Cambiar la fecha',
    changeTime: 'Cambiar la hora',
    status: 'Estado',
    unschedule: 'Desprogramar',
    delete: 'Eliminar',
    clear: 'Borrar selección',
    deleted_one: '{{formatted}} publicación eliminada',
    deleted_other: '{{formatted}} publicaciones eliminadas',
  },
  add: 'Añadir campaña',
  error: 'No se pudieron cargar las campañas',
  list: {
    group: {
      live: 'En curso',
      planning: 'En preparación',
      new: 'Nuevas',
      ended: 'Terminadas',
    },
    open: 'Abrir {{name}}',
    actions: 'Acciones de {{name}}',
    noChannels: 'Sin canales todavía',
    goodShape: 'Todo en orden',
    line: {
      published_one: '{{formatted}} publicada en los últimos {{days}} días',
      published_other: '{{formatted}} publicadas en los últimos {{days}} días',
      publishedTotal_one: '{{formatted}} publicada',
      publishedTotal_other: '{{formatted}} publicadas',
      publishedOf_one: '{{formatted}} de {{goal}} publicada',
      publishedOf_other: '{{formatted}} de {{goal}} publicadas',
      scheduledNext_one:
        '{{formatted}} programada en los próximos {{days}} días',
      scheduledNext_other:
        '{{formatted}} programadas en los próximos {{days}} días',
      scheduled_one: '{{formatted}} programada',
      scheduled_other: '{{formatted}} programadas',
      pace_one: 'Ritmo de {{formatted}} publicación por semana',
      pace_other: 'Ritmo de {{formatted}} publicaciones por semana',
      pacePlanned_one: 'Ritmo previsto de {{formatted}} publicación por semana',
      pacePlanned_other:
        'Ritmo previsto de {{formatted}} publicaciones por semana',
      nothingYet: 'Nada publicado ni programado todavía',
      failed_one: '{{formatted}} fallida',
      failed_other: '{{formatted}} fallidas',
      neverPublished_one: '{{formatted}} no llegó a salir',
      neverPublished_other: '{{formatted}} no llegaron a salir',
      reach: 'Alcance de {{formatted}}',
      interactions_one: '{{formatted}} interacción',
      interactions_other: '{{formatted}} interacciones',
    },
    setUp: 'Por configurar',
    notDated: 'Sin fechas todavía',
    loadFailed:
      'No se pudieron cargar las publicaciones. Las cifras aparecerán en cuanto se pueda volver a acceder a ellas.',
  },
  untitled: 'esta campaña',
  empty: {
    title: 'Todavía no hay campañas',
    subtitle: 'Crea tu primera campaña para empezar',
  },
  archivedSection: 'Campañas archivadas',
  archivedError: 'No se pudieron cargar las campañas archivadas',
  archivedOn: 'Archivada el {{archivedOn}}',
  unarchive: 'Desarchivar',
  archivedEmpty:
    'No hay nada archivado. Archivar una campaña la quita de la lista sin borrar nada: sus publicaciones, su calendario y su contenido siguen tal cual.',
  strategy: {
    commitment: 'El compromiso',
    spend: 'Presupuesto e idioma',
    removedByAssistant: '{{what}} quitado por el asistente',
    undoInThread: 'DESHACER está en la conversación',
    /** The Goals card's one action: it opens or closes the section. */
    goals: {
      switchOn: 'Activar',
      switchOff: 'Desactivar',
    },
    /** The Messaging card's one action, which asks the assistant. */
    messaging: {
      generateBrief: 'Generar briefing',
      improveBrief: 'Mejorar briefing',
    },
    campaigns: {
      title: 'Campañas',
      empty: 'Todavía no hay campañas.',
      windowAndRate: '{{window}} · {{rate}}',
      perWeek_one: '{{formatted}} publicación a la semana',
      perWeek_other: '{{formatted}} publicaciones a la semana',
      perMonth_one: '{{formatted}} publicación al mes',
      perMonth_other: '{{formatted}} publicaciones al mes',
      noRate: 'Sin objetivo de publicaciones',
      noPlatforms: 'Sin plataformas',
      noVoice: 'Sin voz',
      defaultVoice: '{{voice}} (predeterminada)',
    },
  },
  type: {
    label: 'Tipo de campaña',
    change: 'Cambiar',
    cancel: 'Cancelar',
    locked_one:
      'Bloqueado: {{count}} publicación está planificada en las fases de este tipo.',
    locked_other:
      'Bloqueado: {{count}} publicaciones están planificadas en las fases de este tipo.',
    lockedUncounted:
      'Bloqueado: hay publicaciones planificadas en las fases de este tipo.',
    lockedToastTitle: 'El tipo de campaña ya no se puede cambiar',
    lockedToastBody:
      'Ya hay publicaciones planificadas en sus fases, así que se ha restablecido el tipo. Tus otros cambios siguen sin guardar.',
  },
  phases: {
    title: 'Fases',
    derived: 'Repartidas por igual entre las fechas de la campaña.',
    manual: 'Fechas fijadas a mano.',
    reset: 'Repartir por igual de nuevo',
    unscheduled:
      'Fija una fecha de inicio y de fin para ver cuándo se ejecuta cada fase.',
    tooShort_one:
      'La campaña es más corta que su {{count}} fase, así que no se puede dividir.',
    tooShort_other:
      'La campaña es más corta que sus {{count}} fases, así que no se pueden dividir.',
    pendingDates: 'Guarda las nuevas fechas para replanificar las fases.',
    pendingType: 'Guarda el nuevo tipo para ver sus fases.',
    empty: 'Este tipo de campaña no tiene fases.',
    loadError: 'No se pudieron cargar las fases.',
    meta: '{{range}} · {{posts}}',
    posts_one: '{{count}} publicación',
    posts_other: '{{count}} publicaciones',
    endsLabel: 'Cuándo termina {{phase}}',
    saveError: 'No se pudieron guardar las fechas de las fases',
    resetError: 'No se pudieron volver a repartir las fases por igual',
    resetBySave:
      'Las fechas de las fases volvieron a un reparto igual, porque cambiaron las fechas o el tipo de la campaña.',
  },
  settings: {
    record: 'El registro',
  },
  dangerZone: {
    title: 'Zona de peligro',
    body: 'Dos maneras de dejar de ejecutar esta campaña. Archivarla lo conserva todo y se puede deshacer; eliminarla borra la campaña y sus publicaciones para siempre.',
    archive: {
      action: 'Archivar campaña',
      confirmTitle: '¿Archivar {{name}}?',
      confirmBody:
        'La campaña sale de la lista de campañas y deja de ofrecerse allí donde se archiva trabajo nuevo. No se borra nada. Sus publicaciones, su calendario, su brief y su contenido siguen tal cual, y puedes recuperarla desde el archivo cuando quieras.',
      keep: 'Mantenerla activa',
      confirm: 'Archivar campaña',
    },
    delete: {
      action: 'Eliminar campaña',
      confirmTitle: '¿Eliminar {{name}}?',
      confirmBody:
        'Se borran la campaña, sus publicaciones y su calendario, y nada en la aplicación puede recuperarlos. Las publicaciones ya publicadas siguen activas en las redes sociales. Archívala si solo quieres quitarla de la lista.',
      keep: 'Mantener campaña',
      confirm: 'Eliminar campaña',
    },
  },
}

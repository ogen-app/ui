import type { Translation } from '../en'

export const activity: Translation['activity'] = {
  stub: {
    campaignTitle: 'Aquí vivirá la actividad de esta campaña',
    campaignBody:
      'El mismo historial que el del espacio de trabajo, reducido a lo que ocurrió dentro de esta campaña.',
  },
  title: 'Actividad',
  loadFailed: 'No se pudo cargar la actividad',
  unavailable: {
    notifications:
      'No se pudieron cargar las notificaciones; solo se muestran los informes diarios.',
    reports:
      'No se pudieron cargar los informes diarios; solo se muestra lo que quedó registrado cuando ocurrió.',
    links:
      'No se pudieron cargar los resúmenes de campaña; puede que algunas entradas no enlacen con aquello de lo que hablan.',
  },
  truncated:
    'Mostrando las {{entries}} entradas más recientes y los últimos {{days}} días con algo que contar.',
  empty: {
    title: 'Todavía no ha pasado nada',
    subtitle:
      'Aquí aparecerán las publicaciones que salgan, las que fallen y un informe de cada día.',
  },
  needsYou: {
    title: 'Te necesita',
    showMore_one: 'VER {{formatted}} MÁS',
    showMore_other: 'VER {{formatted}} MÁS',
    allSet: 'Nada te necesita',
    allSetBody:
      'Nada ha fallado, va con retraso ni está a punto de vencer en ninguna campaña. Si eso cambia, aparecerá aquí.',
  },
  unread: 'Sin leer',
  recent: 'Nuevo',
  seenBefore: 'Visto antes de esta visita',
  today: 'Hoy',
  yesterday: 'Ayer',
  entry: {
    reportTitle: 'Informe diario',
    task_created: 'Tarea añadida — «{{title}}»',
    task_completed: 'Tarea hecha — «{{title}}»',
    task_resolved: 'Tarea resuelta sola — «{{title}}»',
  },
  notification: {
    connectionExpiring: 'Tu conexión con {{channel}} caduca pronto',
    connectionActionRequired: 'Tu conexión con {{channel}} debe reconectarse',
    postPublished: 'Se publicó una publicación de {{channel}}',
    postPublishFailed: 'No se pudo publicar una publicación de {{channel}}',
    postFirstCommentFailed:
      'No se pudo publicar el primer comentario de una publicación',
    billingTrialEndedUnpaid:
      'Tu mes gratis terminó sin un plan, así que tus cuentas sociales se desconectaron. Elige un plan para volver a conectarlas.',
    postManualPublishDue: 'Hay una publicación pendiente de publicar a mano',
    assetReady: 'Un documento terminó de procesarse',
    assetIngestFailed: 'No se pudo procesar un documento',
    urlAssetCrawled: 'Se terminó de leer un enlace',
    urlAssetFailed: 'No se pudo leer un enlace',
    campaignContentPlanReady_one:
      'Hay un plan de contenido listo — {{count}} publicación',
    campaignContentPlanReady_other:
      'Hay un plan de contenido listo — {{count}} publicaciones',
    contentPlanFailed: 'No se pudo generar un plan de contenido',
    assistantCompleted: 'El asistente terminó tu solicitud',
    assistantFailed: 'El asistente no pudo terminar tu solicitud',
    assessmentCompleted: 'Hay una evaluación de calidad lista',
    assessmentFailed: 'No se pudo completar una evaluación de calidad',
    pluginConnected: 'Plugin de Figma conectado: {{label}}',
    entitlement: {
      seats: {
        reached: 'Los {{limit}} puestos de tu plan están ocupados',
        approaching:
          '{{current}} de {{limit}} puestos de tu plan están ocupados',
      },
      campaigns: {
        reached: 'Las {{limit}} campañas que permite tu plan están activas',
        approaching:
          '{{current}} de {{limit}} campañas que permite tu plan están activas',
      },
      documents: {
        reached: 'El banco de contenido está lleno con {{limit}} documentos',
        approaching:
          'El banco de contenido tiene {{current}} de {{limit}} documentos',
      },
      storage: {
        reached: 'El almacenamiento multimedia está lleno con {{limit}}',
        approaching:
          'El almacenamiento multimedia está en {{current}} de {{limit}}',
      },
    },
  },
  report: {
    label: {
      published: 'Publicadas',
      failed: 'Fallidas',
      created: 'Creadas',
      campaigns: 'Campañas',
    },
    published_one: '{{count}} publicación publicada',
    published_other: '{{count}} publicaciones publicadas',
    failed_one: '{{count}} publicación no llegó a salir',
    failed_other: '{{count}} publicaciones no llegaron a salir',
    created_one: '{{count}} publicación creada',
    created_other: '{{count}} publicaciones creadas',
    campaignsCreated_one: '{{count}} campaña empezada',
    campaignsCreated_other: '{{count}} campañas empezadas',
    scheduled_one: '{{count}} programada',
    scheduled_other: '{{count}} programadas',
    byChannel: 'Publicado por canal',
    didNotGoOut: 'No llegaron a salir',
    createdBy: 'Escritas por',
    campaignsStarted: 'Campañas empezadas',
    status: {
      failed: 'No se pudo publicar',
      notPublished: 'Nunca se publicó',
    },
    formerMember: 'Alguien que ya no está',
    noAuthor: 'Sin registrar',
    loading: 'Contando el día…',
    loadFailed: 'No se pudo cargar este informe.',
    nothing: 'Ese día no pasó nada.',
    coverage:
      'Calculado a partir de las publicaciones de este espacio, según el día natural en {{zone}}.',
  },
}

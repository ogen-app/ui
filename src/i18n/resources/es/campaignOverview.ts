import type { Translation } from '../en'

export const campaignOverview: Translation['campaignOverview'] = {
  openOverview: 'Abrir resumen',
  openPosts: 'Abrir publicaciones',
  openIdeas: 'Abrir ideas',
  openCalendar: 'Abrir calendario',
  openActivity: 'Abrir actividad',
  openAnalytics: 'Abrir analíticas',
  openStrategy: 'Abrir estrategia',
  openAssets: 'Abrir recursos',
  openSettings: 'Abrir ajustes',

  doors: {
    title: 'Todo lo de esta campaña',
    loading: 'Contando…',
    strategy: {
      set_one: 'Fechas, objetivo y {{formatted}} canal',
      set_other: 'Fechas, objetivo y {{formatted}} canales',
      noDates: 'Todavía sin fechas',
      noGoal: 'Todavía sin objetivo de publicaciones',
      noChannels: 'Todavía sin canales',
      notConnected: 'Ninguna cuenta con la que publicar',
    },
    ideas: {
      waiting_one: '{{formatted}} idea esperando una decisión',
      waiting_other: '{{formatted}} ideas esperando una decisión',
      none: 'Nada esperando una decisión',
    },
    assets: {
      all: 'Todos los documentos del espacio de trabajo',
      some_one: '{{formatted}} documento',
      some_other: '{{formatted}} documentos',
      none: 'Ninguno todavía: Ogen escribe a partir del brief',
    },
    posts: {
      none: 'Todavía sin publicaciones',
      some_one: '{{formatted}} publicación',
      some_other: '{{formatted}} publicaciones',
      drafts_one: '{{formatted}} todavía en borrador',
      drafts_other: '{{formatted}} todavía en borrador',
    },
    calendar: {
      next_one: '{{formatted}} programada, la próxima el {{date}}',
      next_other: '{{formatted}} programadas, la próxima el {{date}}',
      some_one: '{{formatted}} programada',
      some_other: '{{formatted}} programadas',
      none: 'Nada programado',
      over: 'No queda nada por salir',
    },
    analytics: {
      some_one: '{{formatted}} publicación publicada',
      some_other: '{{formatted}} publicaciones publicadas',
      none: 'Resultados cuando salga una publicación',
    },
    settings: 'Nombre, tipo, archivar o eliminar',
  },
  problems: {
    ignore: 'Ignorar',
    ignoreFailed: 'No se pudo ignorar ese problema. Inténtalo de nuevo.',
    fixAll: 'Arreglar con Ogen',
    askAll: 'Arreglemos esto juntos.',
    askFix: '{{fix}}: {{problem}}',
  },
  todo: {
    addPost: 'Añadir publicación',
  },
  stats: {
    dayOf: 'día {{day}} de {{total}}',
    startsIn: 'empieza {{when}}',
    ended: 'terminó {{when}}',
    published: 'Publicadas',
    failed: 'Fallidas',
    untitledPost: 'Publicación sin título',
  },
  stage: {
    new: 'Nueva',
    planning: 'En preparación',
    launched: 'Recién lanzada',
    running: 'En curso',
    closing: 'Cerrando',
    ended: 'Terminada',
  },
  band: {
    when: '{{range}} | {{where}}',
    phaseNow: 'Fase {{name}}, día {{day}} de {{total}}',
    scheduled: 'Programadas',
    publishedRecent: 'Publicadas, últimos {{days}} días',
    scheduledRecent: 'Programadas, próximos {{days}} días',
    pace: 'Ritmo semanal',
    pacePlanned: 'Ritmo semanal previsto',
  },
  week: {
    this: 'Esta semana',
    first: 'Primera semana',
    today: 'Hoy',
    empty: 'No sale nada esta semana.',
    manual: 'MANUAL',
  },
  results: {
    title: 'Resultados',
    publishedOf_one: 'Publicadas de {{formatted}}',
    publishedOf_other: 'Publicadas de {{formatted}}',
    neverPublished: 'No llegaron a salir',
  },
  figures: {
    reach: 'Alcance',
    interactions: 'Interacciones',
    best: 'Mejor publicación',
    reachOf: '{{reach}} de alcance',
  },
  needs: {
    needsYou: 'Te necesita',
    beforeLaunch: 'Antes del lanzamiento',
    wrapUp: 'Cierre',
    none: 'Nada espera por ti.',
    more_one: '+{{formatted}} similar',
    more_other: '+{{formatted}} similares',
    menu: 'Más soluciones',
    firstPost: 'Añade la primera publicación',
    coverageGaps_one:
      '{{formatted}} día de publicación de las primeras dos semanas no tiene nada previsto',
    coverageGaps_other:
      '{{formatted}} días de publicación de las primeras dos semanas no tienen nada previsto',
    readResults: 'Revisa cómo fue la campaña',
    archive: 'Archiva la campaña',
  },
  setup: {
    title: 'Prepara esta campaña',
    withOgen: 'Hacerlo con Ogen',
    strategy: {
      title: 'Fechas y objetivo de publicaciones',
      detail: 'Cuándo se ejecuta y con qué frecuencia publica.',
      action: 'Fijar fechas',
      ask: 'Sugiere fechas y un objetivo de publicaciones para esta campaña.',
    },
    channels: {
      title: 'Canales',
      detail: 'Dónde publica, con una cuenta conectada.',
      action: 'Elegir canales',
      ask: 'Sugiere en qué canales debería publicar esta campaña.',
    },
    posts: {
      title: 'La primera publicación',
      detail: 'Escríbela tú o deja que Ogen prepare un plan.',
      action: 'Añadir publicación',
      ask: 'Genera un plan de contenido para esta campaña.',
    },
  },
  learn: {
    title: 'Cómo funciona una campaña',
    stages: {
      title: 'Sus fechas marcan su etapa',
      detail:
        'En preparación antes de empezar, en marcha mientras dura, terminada después. Esta página cambia con ella.',
    },
    goal: {
      title: 'El objetivo es un ritmo',
      detail:
        'Tantas publicaciones por semana o por mes. El total sale de las fechas.',
    },
    ogen: {
      title: 'Ogen trabaja dentro de ella',
      detail:
        'El asistente lee la estrategia y los recursos de la campaña, así que lo que redacta encaja con el brief.',
    },
  },
}

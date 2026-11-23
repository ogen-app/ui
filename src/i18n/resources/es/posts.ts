import type { Translation } from '../en'

export const posts: Translation['posts'] = {
  publishStatus: {
    auto: 'Publicación automática {{when}}',
    manual: 'Recordatorio {{when}}',
    compactNow: 'ahora',
    compactLate: '{{amount}} de retraso',
  },

  publishedLink: {
    view: 'Ver publicación',
    add: 'Añadir enlace a la publicación',
  },

  sequence: {
    explainer:
      'Esto se publica como una cadena de publicaciones, cada una respondiendo a la anterior. Escribe --- en una línea aparte donde quieras un corte: ahí van los cortes, exactamente donde los pongas y por larga que salga cada publicación. Si no hay ningún divisor, se reparte solo para caber en el límite de caracteres.',

    splitByDivider_one:
      'Se publica como {{count}} publicación, cortada donde pusiste un divisor.',
    splitByDivider_other:
      'Se publica como {{count}} publicaciones, cortadas donde pusiste un divisor.',
    splitByLimit_one:
      'Se publica como {{count}} publicación, repartida para caber en {{limit}} caracteres.',
    splitByLimit_other:
      'Se publica como {{count}} publicaciones, repartidas para caber en {{limit}} caracteres.',
    splitSingle: 'Se publica como una sola publicación.',
    splitPending: 'Calculando en cuántas publicaciones se divide esto…',
    splitOverflow:
      'Esto son más de {{max}} publicaciones. Acórtalo o publícalo como más de un hilo.',

    mediaPerPost: 'Todos los límites de aquí son por publicación del hilo.',
    mediaOn: 'Publicación {{position}}',
    mediaOnLabel: 'Este archivo va en la publicación {{position}}: elige otra',

    postCount_one: '{{count}} publicación',
    postCount_other: '{{count}} publicaciones',

    check: {
      label: 'Hilo',
      pending: 'Comprobando…',
      overflow: 'Más de {{max}} publicaciones',
      tooLong_one: 'La publicación {{positions}} pasa de {{limit}} caracteres',
      tooLong_other:
        'Las publicaciones {{positions}} pasan de {{limit}} caracteres',
      tooLongNoLimit_one:
        'La publicación {{positions}} supera el límite de longitud de la plataforma',
      tooLongNoLimit_other:
        'Las publicaciones {{positions}} superan el límite de longitud de la plataforma',
      issues_one:
        'La publicación {{positions}} lleva más archivos de los que admite una publicación',
      issues_other:
        'Las publicaciones {{positions}} llevan más archivos de los que admite una publicación',
      singular: 'Un solo mensaje, así que se publica como una publicación.',
      singularAs: 'Un solo mensaje, así que se publica como «{{type}}».',
      runts_one:
        'La publicación {{positions}} es muy corta: ¿es un salto involuntario?',
      runts_other:
        'Las publicaciones {{positions}} son muy cortas: ¿son saltos involuntarios?',
    },

    previewNote:
      'Un hilo: cada publicación de abajo sale por separado, respondiendo a la anterior.',
    previewNoteUnsplit:
      'La tarjeta divide esto en las líneas en blanco, pero se publica como una sola publicación: Ogen aún no envía el hilo.',
  },

  status: {
    draft: 'Borrador',
    planned: 'Planificada',
    ready_for_publish: 'Lista para publicar',
    scheduled: 'Publicación automática',
    scheduled_for_manual_publishing: 'Publicación manual',
    failed: 'Fallida',
    published: 'Publicada',
    not_published: 'No publicada',
  },

  noPlatform: 'Sin plataforma',
  noAccount: 'Sin cuenta',
  noPostType: 'Sin tipo de publicación',

  postType: {
    auto: 'Automático',
    // El nombre del formato no se traduce: las etiquetas de tipo de
    // publicación son del front-end y están en inglés en toda la app.
    autoResolved: 'Automático · {{type}}',
    autoHint: 'Según la publicación',
    checkLabel: 'Tipo de publicación',
    autoPending: 'Determinando el formato…',
    autoUnfit: {
      tooLong:
        'Demasiado largo para cualquier formato de esta campaña: el más amplio admite {{limit}} caracteres',
      mediaKind:
        'Ningún formato que publique esta campaña admite los archivos adjuntos',
      tooMany: 'Demasiados archivos para cualquier formato de esta campaña',
      noCandidates:
        'Esta campaña no habilita ningún formato que pueda elegirse automáticamente',
    },
  },

  editor: {
    titlePlaceholder: 'Título',
    untitled: 'Publicación sin título',
    back: 'Volver a las publicaciones',
    more: 'Más acciones',
    downloadMarkdown: 'Descargar como Markdown',
    delete: 'ELIMINAR PUBLICACIÓN',
    previous: 'Publicación anterior',
    next: 'Publicación siguiente',
    position: '{{position}} de {{total}}',
    tabs: {
      label: 'Sobre esta publicación',
      overview: 'Resumen',
      preview: 'Vista',
      checks: 'Revisión',
      quality: 'Calidad',
      sources: 'Fuentes',
      notes: 'Notas',
      history: 'Historial',
      withWarnings_one: '{{label}}: 1 cosa por revisar',
      withWarnings_other: '{{label}}: {{count}} cosas por revisar',
    },
    settings: {
      platform: 'Plataforma',
      postType: 'Tipo',
      account: 'Cuenta',
      date: 'Publicar',
      publishing: 'Publicación',
      phase: 'Fase',
      noPhase: 'Sin fase',
      format: 'Formato',
      platformChange: 'Cambiar de plataforma',
      platformPick: 'Elegir plataforma',
      platformPickHint:
        'Elige la plataforma en la que se publica: decide los tipos de publicación disponibles y la cuenta que publica.',
      platformNone: 'Esta campaña no tiene plataformas',
      platformDeselect: 'Quitar la plataforma',
      postTypeChange: 'Cambiar el tipo de publicación',
      postTypePick: 'Elegir tipo de publicación',
      postTypePickHint:
        'Elige el tipo de publicación de {{platform}}: fija el formato con el que se publica.',
      postTypeNone: 'Esta campaña no tiene tipos de publicación',
      notConnected: 'Sin conectar',
      accountChange: 'Cambiar la cuenta con la que se publica',
      accountNone: 'Ninguna cuenta conectada',
      accountNoneHint:
        'No hay ninguna cuenta de {{platform}} conectada, así que nada puede publicar esta publicación. Conecta una en los ajustes de plataformas.',
      accountNotRecorded: 'Cuenta sin registrar',
      accountDisconnected: '{{name}}: desconectada',
      accountDisconnectedUnnamed: 'Cuenta desconectada',
      accountGoneHint:
        '{{name}} ya no está conectada a {{platform}}, así que esta publicación no puede salir con ella. Elige otra cuenta.',
      accountGoneHintUnnamed:
        'La cuenta con la que se publica ya no está conectada a {{platform}}. Elige otra.',
      accountPick: 'Elegir cuenta',
      accountPickHint_one:
        'Este espacio de trabajo tiene {{count}} cuenta de {{platform}} conectada: elige con cuál se publica.',
      accountPickHint_other:
        'Este espacio de trabajo tiene {{count}} cuentas de {{platform}} conectadas: elige con cuál se publica.',
      methodChange: 'Cambiar cómo se publica',
      methodNotAllowed:
        'No está permitido para {{platform}} en este espacio de trabajo: cámbialo en los ajustes del espacio de trabajo.',
      methodNotAllowedUnnamed:
        'No está permitido para esta plataforma en este espacio de trabajo: cámbialo en los ajustes del espacio de trabajo.',
      methodNoAccount:
        'No hay ninguna cuenta de {{platform}} conectada: se quedará en un recordatorio.',
      methodNoAccountUnnamed:
        'No hay ninguna cuenta para publicar conectada: se quedará en un recordatorio.',
    },
    overview: {
      publishing: 'Publicación',
      health: 'Estado',
      quality: 'Calidad',
      notes: 'Notas',
      sources: 'Fuentes',
      writing: 'Redacción',
      open: 'Abrir {{tab}}',
      moreChecks_one: 'y {{count}} más',
      moreChecks_other: 'y {{count}} más',
      moreNotes_one: 'y {{count}} nota más',
      moreNotes_other: 'y {{count}} notas más',
      score: 'Puntuación',
      notAssessed: 'Aún sin evaluar',
      note: 'Nota',
      attached: 'Adjuntas',
      sourceCount_one: '{{count}} fuente',
      sourceCount_other: '{{count}} fuentes',
      noSources: 'Sin fuentes',
      notGrounded: 'Sin fundamentar: escrita con conocimiento general',
      problems: {
        platform: 'Elige una plataforma.',
        postType: 'Elige un tipo de publicación.',
        videoUnsupported:
          'Este tipo de publicación necesita vídeo, y la plataforma no lo publica.',
        videoTitle: 'El vídeo necesita un título.',
        titleOver_one: 'El título se pasa en {{count}} carácter.',
        titleOver_other: 'El título se pasa en {{count}} caracteres.',
        copy: 'La publicación necesita texto.',
        copyEmpty: 'Aún no hay texto.',
        lengthOver_one: 'Se pasa de largo en {{count}} carácter.',
        lengthOver_other: 'Se pasa de largo en {{count}} caracteres.',
        needVideo: 'La publicación necesita un vídeo.',
        needImage: 'La publicación necesita una imagen.',
        needFile: 'La publicación necesita un archivo.',
        tooFew_one: 'La publicación necesita {{count}} archivo más.',
        tooFew_other: 'La publicación necesita {{count}} archivos más.',
        tooMany_one: 'Sobra un archivo: la plataforma admite {{max}}.',
        tooMany_other:
          'Sobran {{count}} archivos: la plataforma admite {{max}}.',
        unwanted: 'Este tipo de publicación sale sin archivos.',
        wrongKind_one:
          '{{count}} archivo no puede salir con este tipo de publicación.',
        wrongKind_other:
          '{{count}} archivos no pueden salir con este tipo de publicación.',
        altText_one: '{{count}} imagen no tiene texto alternativo.',
        altText_other: '{{count}} imágenes no tienen texto alternativo.',
      },
    },
    schedule: {
      setDate: 'Fijar la fecha de publicación',
      pickDate: 'Elegir fecha de publicación',
      time: 'Hora de publicación',
      noDateHint:
        'Esta publicación no tiene fecha, así que no se puede programar. Elige una fecha y una hora.',
      pastHint:
        'La fecha de publicación ya ha pasado. Para programarla hace falta una fecha futura: elige otra.',
      unscheduling: 'Desprogramando…',
      noDate: 'Sin fecha de publicación',
      autoAt: 'Se publica sola el {{when}}',
      manualAt: 'Publicación manual: aviso el {{when}}',
      publishedAt: 'Publicada el {{when}}',
      published: 'Publicada',
      failedAt: 'No se pudo publicar: estaba programada para el {{when}}',
      failed: 'No se pudo publicar',
      notPublishedAt: 'Sin publicar: estaba prevista para el {{when}}',
      notPublished: 'Sin publicar',
      plannedAt: 'Prevista para el {{when}}',
      notScheduled: 'Aún sin programar',
    },
    checks: {
      notAssessed: 'Aún sin evaluar.',
    },
  },

  hasProblem: 'Esta publicación tiene un problema',
  outsideCampaign: {
    check: 'Campaña',
    platform: 'No es una plataforma de esta campaña',
    postType: 'No es un tipo de publicación de esta campaña',
  },

  /**
   * Adjuntar una imagen de Recursos a una publicación (CON-290).
   */
  media: {
    /** The shut media card's one action. */
    add: 'Añadir medios',
    addMore: 'Añadir más',
    fromAssets: {
      tile: 'Desde Recursos',
      title: 'Añadir imágenes desde Recursos',
      scopeCampaign: 'Esta campaña',
      scopeWorkspace: 'Todos los recursos',
      search: 'Buscar imágenes',
      searchLabel: 'Buscar imágenes en Recursos',
      clearSearch: 'Borrar búsqueda',
      room_one: 'Cabe una imagen más en esta publicación.',
      room_other: 'Caben {{count}} imágenes más en esta publicación.',
      error: 'No se pudieron leer los Recursos.',
      emptyCampaign:
        'Esta campaña aún no tiene imágenes. Cambia a Todos los recursos para elegir entre todo el espacio de trabajo.',
      emptyWorkspace: 'Aún no hay imágenes en Recursos.',
      noMatch: 'Ninguna imagen coincide.',
      onPost: 'En esta publicación',
      processing: 'Procesando',
      failed: 'Error',
      add: 'Añadir',
      addCount_one: 'Añadir {{count}} imagen',
      addCount_other: 'Añadir {{count}} imágenes',
      failedToast: 'No se pudo añadir {{title}}',
      errors: {
        locked:
          'Esta publicación está programada o publicada, así que su contenido multimedia ya no puede cambiar.',
        gone: 'Esta imagen ya no está en Recursos.',
        postGone: 'Esta publicación se ha eliminado.',
        noFile: 'Este recurso no tiene una imagen guardada que adjuntar.',
      },
    },
    /**
     * Descripción accesible de una imagen, que se publica con ella.
     */
    altText: {
      state: {
        missing: 'Sin texto alternativo',
        generated: 'Auto · revisar',
        written: 'Texto alternativo',
      },
      edit: 'Editar texto alternativo',
      view: 'Ver texto alternativo',
      title: 'Texto alternativo',
      help: 'Describe lo que muestra la imagen para quienes usan un lector de pantalla. Se publica con la imagen.',
      generatedNote:
        'Ogen escribió esta descripción a partir de la imagen. Se publica tal cual salvo que la cambies; guardarla, aunque no la cambies, evita que se reescriba.',
      placeholder: 'p. ej., Un barista dibuja arte latte en una taza blanca',
      count: '{{length}} / {{limit}} caracteres',
      over: '{{length}} / {{limit}} caracteres — {{over}} de más',
      save: 'GUARDAR',
      cancel: 'CANCELAR',
      close: 'CERRAR',
    },
  },

  /**
   * Por qué no se pudo publicar una publicación (CON-200).
   */
  failure: {
    noAccount:
      'No hay ninguna cuenta conectada para esta red, así que no había dónde publicarla. Conecta una y vuelve a programarla.',
    chooseAccount:
      'Hay más de una cuenta conectada para esta red y no se eligió ninguna. Elige una y vuelve a programarla.',
    accountGone:
      'La cuenta elegida para esta publicación ya no está conectada. Elige otra y vuelve a programarla.',
    accountMismatch:
      'La cuenta elegida para esta publicación pertenece a otra red. Elige una de esta red y vuelve a programarla.',
    duplicate:
      'Ya se envió un contenido idéntico en las últimas 24 horas, así que el servicio de publicación lo rechazó. Cambia el texto y vuelve a programarla.',
    rejected: 'El servicio de publicación rechazó esta publicación. Respondió:',
    rejectedAlone: 'El servicio de publicación rechazó esta publicación.',
    retryRejected:
      'El servicio de publicación se negó a volver a enviar esta publicación. Respondió:',
    retryRejectedAlone:
      'El servicio de publicación se negó a volver a enviar esta publicación.',
    networkRefused: 'La red rechazó esta publicación al ir a publicarla.',
    partial:
      'Esta publicación solo se publicó en parte, así que figura como fallida.',
    noPlatform:
      'Esta publicación no tenía ninguna red asignada, así que no se pudo publicar.',
    unsupported:
      'En esta red no se puede publicar automáticamente. Publícala a mano.',
    notSetUp:
      'La publicación automática aún no está configurada en este espacio de trabajo.',
    unknown: 'La publicación falló. El servidor respondió:',
    unknownAlone:
      'La publicación falló por un motivo que esta versión de la aplicación no reconoce.',
  },

  sources: {
    heading: 'Fuentes',
    sectionTitle: 'FUENTES',
    add: 'AÑADIR UNA FUENTE',
    fromBank: 'Elegir del banco de contenido',
    upload: 'Subir archivos',
    webPage: 'Añadir una página web',
    emptyCard:
      'Esta publicación se basa únicamente en el brief de la campaña. Añade los documentos de los que también debería partir: el asistente lee exactamente lo que aparece aquí.',
    emptyRail:
      'Nada todavía — esta publicación se basa únicamente en el brief de la campaña.',
    emptyLocked:
      'Esta publicación se basa únicamente en el brief de la campaña.',
    loading: 'Cargando…',
    unreadable: 'No se puede leer',
    unreadableHint:
      'No se extrajo nada de este documento, así que la recuperación lo omite.',
    reading: 'Leyendo todavía',
    remove: 'Quitar {{title}} de esta publicación',
  },

  locked: {
    scheduled:
      'Esta publicación está programada. Cancela la programación para modificarla.',
    published:
      'Esta publicación ya salió — lo que ves es el registro de lo que se publicó.',
  },

  performance: {
    title: 'Analíticas',
    unlinked: {
      body: 'Nada conecta esta publicación con lo que se publicó. Salió a mano, así que no podemos encontrarla en la plataforma ni tenemos cifras suyas. Añadir el enlace conecta las dos — a partir de ahí se mide como cualquier otra.',
      action: 'Añadir enlace',
    },
    waiting: {
      body: 'Las cifras están en camino. Esta publicación ya salió y aún no han vuelto las primeras cifras. Suelen llegar en unas horas; esto se rellenará solo.',
    },
    unavailable: {
      body: 'Las analíticas no están activadas en esta instalación, así que no se recogen cifras de las publicaciones.',
    },
    error: {
      body: 'No se han podido cargar las cifras de esta publicación.',
    },
  },

  quality: {
    bands: {
      strong: 'Buena',
      workable: 'Aceptable',
      weak: 'Floja',
    },
    score: 'Calidad de la publicación {{score}}',
    assess: 'Evaluar la calidad',
    reassess: 'Volver a evaluar',
    assessing: 'Evaluando…',
    neverScored: 'Esta publicación nunca se evaluó.',
    scoringIsForDrafts:
      'La evaluación es para una publicación que todavía puedes cambiar.',

    dimensions: {
      correctness: 'Precisión',
      clarity: 'Claridad',
      engagement: 'Interacción',
      delivery: 'Encaje con el canal',
    },
    outOfTen: '/10',

    summary: {
      upFrom: 'Sube desde <strong>{{score}}</strong> antes de tus cambios',
      downFrom: 'Baja desde <strong>{{score}}</strong> antes de tus cambios',
      sameAs: 'Igual que antes de tus cambios',
      weighsMost: '{{dimension}} es lo que más pesa en este formato.',
    },

    radar: {
      writing: 'El texto',
      channel: 'Encaje con {{platform}}',
      channelGeneric: 'Encaje con el canal',
      scores: '{{scores}}.',
      scoreItem: '{{dimension}} {{score}}',
      lowest: '{{dimension}} es la más baja.',
      corner: '{{dimension}}: {{score}} de 10. Ver por qué.',
      legendNow: 'Esta evaluación',
      legendBefore: 'Antes de tus cambios',
      legendGood: '8+ es buena',
    },

    guide: {
      open: 'Cómo leer el radar',
      title: 'Cómo leer el radar',
      close: 'Cerrar',
      ringsTitle: 'Anillos en 5 y 8',
      ringsBody: 'Por debajo de 5 es floja, de 5 a 7 aceptable, 8+ buena.',
      halvesTitle: 'Dos mitades',
      halvesBody: 'Izquierda: el texto. Derecha: encaje con {{platform}}.',
      halvesBodyGeneric: 'Izquierda: el texto. Derecha: encaje con el canal.',
      linesTitle: 'Continua y discontinua',
      linesBody:
        'La línea continua es esta evaluación. La discontinua, la anterior a tus cambios.',
      cornersTitle: 'Esquinas',
      cornersBody:
        'Nombre, puntuación y cambio desde la última evaluación. Pulsa una para ver su valoración.',
      zoneTitle: 'Borde sombreado',
      zoneBody: 'Aquí caen las puntuaciones de 8 o más.',
    },

    fixFirst: {
      title: 'Corrige primero',
      order: 'Primero lo de mayor impacto',
      none: 'Esta evaluación no tiene sugerencias.',
      edited: 'Editado',
      wholePost: 'Todo el post <muted>· sin marcar en el texto</muted>',
      announce: 'Resaltado en el post: {{span}}',
      announceWhole: 'Esta sugerencia trata del post entero.',
    },

    reasons: {
      title: 'Por qué estas puntuaciones',
    },

    inline: {
      countNoneHigh_one: '{{count}} sugerencia, no prioritaria.',
      countNoneHigh_other: '{{count}} sugerencias, ninguna prioritaria.',
      countAllHigh_one: '{{count}} sugerencia, prioritaria.',
      countAllHigh_other: '{{count}} sugerencias, todas prioritarias.',
      countSomeHigh_one:
        '{{count}} sugerencias, {{high}} de ellas prioritarias.',
      countSomeHigh_other:
        '{{count}} sugerencias, {{high}} de ellas prioritarias.',
      seeAll_one: 'Ver la sugerencia',
      seeAll_other: 'Ver las {{count}} sugerencias',
    },

    title: 'Calidad',
    inlineHeading: 'Calidad del contenido',
    seeBreakdown: 'Ver el desglose completo',
    assessPost: 'Evaluar esta publicación',
    reassessPost: 'Volver a evaluar esta publicación',
    assessingPost: 'Evaluando esta publicación…',
    scored: 'Evaluada',
    scoredAt: 'Evaluada {{when}}',
    scoredCached: 'Evaluada · sin cambios desde la última vez',
    scoredAtCached: 'Evaluada {{when}} · sin cambios desde la última vez',
    captionScoped:
      'Solo se evaluó el texto. Esta publicación lleva contenido multimedia que el modelo no puede ver, así que lo visual no cuenta en la cifra de arriba.',
    runFailed: 'La evaluación no terminó',
    loadFailed: 'No se ha podido cargar la evaluación',
    suggestionCount_one: '{{count}} sugerencia',
    suggestionCount_other: '{{count}} sugerencias',
    severity: {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    },

    trigger: {
      ready: 'Evaluada automáticamente al marcarla como lista',
      version: 'Evaluada automáticamente al guardar una versión',
      scheduled: 'Evaluada automáticamente al programarla',
      published: 'Evaluada automáticamente al publicarla',
    },

    auto: {
      running: {
        ready:
          'Evaluando automáticamente, porque la publicación se marcó como lista.',
        version: 'Evaluando automáticamente, porque se guardó una versión.',
        scheduled:
          'Evaluando automáticamente, porque la publicación se programó.',
        published:
          'Evaluando automáticamente, porque la publicación se publicó.',
      },
      runningGeneric: 'Evaluando automáticamente.',
    },

    stale: {
      badge: 'Puede estar desactualizada',
      content:
        'La publicación ha cambiado desde que se evaluó. Se vuelve a evaluar automáticamente en el siguiente punto de control, o puedes hacerlo ahora.',
      context:
        'El briefing de la campaña, sus recursos o la forma de evaluar han cambiado desde esta evaluación. Esto nunca se vuelve a evaluar automáticamente.',
      both: 'Tanto la publicación como el contexto de su campaña han cambiado desde esta evaluación. Vuelve a evaluarla para ver cómo está ahora.',
      action: 'Volver a evaluar',
    },

    runs: {
      left_one:
        'Te queda {{count}} de {{limit}} revisiones para esta publicación',
      left_other:
        'Te quedan {{count}} de {{limit}} revisiones para esta publicación',
      none_one:
        'Has usado la única revisión que tu plan permite para esta publicación.',
      none_other:
        'Has usado las {{count}} revisiones que tu plan permite para esta publicación.',
      noneFlat:
        'Has usado todas las revisiones que tu plan permite para esta publicación.',
      noneShort: 'Sin revisiones',
      limitTitle: 'No quedan revisiones para esta publicación',
    },

    empty: {
      unavailable: 'La evaluación está desactivada en este espacio de trabajo.',
      unavailableHint:
        'Alguien con permisos de administración puede activarla en los ajustes.',
      goToSettings: 'Ir a los ajustes del espacio de trabajo',
      broke: 'Vaya, algo ha fallado.',
      loadFailed:
        'Ahora mismo no hemos podido obtener la evaluación de esta publicación.',
      tryAgain: 'Reintentar',
      runFailed:
        'La evaluación se detuvo antes de terminar. No se guardó nada, así que puedes volver a ejecutarla sin problema.',
      notScored: 'Esta publicación todavía no se ha evaluado.',
      notScoredHow:
        'Ogen la lee frente al briefing de la campaña y las convenciones del canal, y evalúa la corrección, la claridad, el engagement y la entrega.',
      notScoredAuto:
        'También se evalúa automáticamente cuando la marcas como lista para publicar.',
    },
  },

  versions: {
    liveDraft: 'Borrador',
    liveDraftTime: 'Sin guardar',
    liveDraftNote: 'Todavía sin instantánea',
    liveSubmitted: 'Texto actual',
    liveSubmittedNote: 'Nunca se guardó una instantánea',
    creator: {
      user: 'Tú',
      assistant: 'Asistente',
      system: 'Ogen',
    },
    systemNote: {
      markedReady: 'Marcada como lista para publicar',
      submitted: 'Enviada para su publicación programada',
      published: 'Publicada',
    },
  },

  firstComment: {
    heading: 'Primer comentario',
    helper:
      'Ideal para enlaces: LinkedIn e Instagram favorecen las publicaciones sin enlaces en el texto.',
    add: 'Añadir primer comentario',
    remove: 'Quitar',
    fieldLabel: 'Primer comentario',
    placeholder: 'Un enlace, una fuente o el resto de la historia',
    delayLabel: 'Publicarlo',
    delay: {
      now: 'De inmediato, con la publicación',
      minutes_one: '{{count}} min después de publicar',
      minutes_other: '{{count}} min después de publicar',
    },
    accountNote:
      'Ogen lo publica desde la cuenta con la que sale esta publicación.',
    target: '{{platform}} ({{type}})',
    unsupported:
      '{{target}} no admite un primer comentario, así que esta publicación no puede salir con uno. Quítalo o elige otra plataforma u otro tipo de publicación.',
    check: {
      label: 'Primer comentario',
      unsupported: 'No disponible en {{target}}',
      within: '{{length}} / {{limit}} caracteres',
      over: '{{length}} / {{limit}} caracteres: {{over}} de más',
    },
    blocker: {
      over: 'Acorta el primer comentario a {{limit}} caracteres',
      unsupported: 'Quita el primer comentario: {{target}} no lo admite',
    },
    timing: {
      withPost: 'Con la publicación',
      after_one: '{{count}} min después de publicar',
      after_other: '{{count}} min después de publicar',
    },
    status: {
      withPost: 'Sale con la publicación',
      afterPublish_one: 'Se publica ~{{count}} min después',
      afterPublish_other: 'Se publica ~{{count}} min después',
      postingIn_one: 'Se publica en ~{{count}} min',
      postingIn_other: 'Se publica en ~{{count}} min',
      postingNow: 'Publicándose ahora',
      delegated: 'Enviado con la publicación',
      posted: 'Publicado · {{at}}',
      postedUndated: 'Publicado',
      failed: 'No publicado: {{error}}',
      failedPermission:
        'No publicado: la cuenta no tiene permiso para comentar.',
      failedUnexplained: 'No publicado',
      reconnect: 'Volver a conectar la cuenta',
      skipped: 'No publicado: la publicación no salió',
    },
  },

  duplicate: {
    action: 'DUPLICAR COMO BORRADOR',
    pending: 'Duplicando…',
    success: 'Borrador creado',
    error: 'No se pudo duplicar la publicación. Inténtalo de nuevo.',
    titleSuffix: '{{title}} (copia)',
  },

  notes: {
    heading: 'Notas',
    add: 'AÑADIR NOTA',
    save: 'GUARDAR',
    cancel: 'CANCELAR',
    delete: 'ELIMINAR',
    edit: 'Editar la nota',

    titlePlaceholder: 'Título (opcional)',
    titleLabel: 'Título de la nota',
    bodyPlaceholder: '¿Qué debería recordar esta publicación?',
    bodyLabel: 'Nota',

    deleteConfirm: '¿Eliminar esta nota? No se podrá recuperar.',

    loadError:
      'No se pudieron cargar las notas. Vuelve a cargar la página para intentarlo de nuevo.',

    origin: {
      assistant: 'Escrita por el asistente de publicaciones',
      generated: 'Capturada cuando se generó esta publicación',
    },

    type: {
      note: 'Nota',
      draftThesis: 'Tesis del borrador',
      imagePrompt: 'Prompt de imagen',
    },
  },
}

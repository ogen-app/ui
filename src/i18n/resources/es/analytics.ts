import type { Translation } from '../en'

export const analytics: Translation['analytics'] = {
  measures: {
    reach: {
      label: 'Alcance',
      periodLabel: 'Alcance acumulado',
      hint: 'Cuentas distintas que vieron una publicación',
    },
    impressions: {
      label: 'Impresiones',
      periodLabel: 'Impresiones acumuladas',
      hint: 'Veces que se mostró una publicación, contando varias veces a la misma persona',
    },
    interactions: {
      label: 'Interacciones',
      periodLabel: 'Interacciones acumuladas',
      hint: 'Me gusta, comentarios, veces compartida y guardados en conjunto',
    },
    engagement_rate: {
      label: 'Tasa de interacción',
      periodLabel: 'Tasa de interacción diaria',
      hint: 'Interacciones como proporción del alcance',
    },
    saves: {
      label: 'Guardados',
      periodLabel: 'Guardados acumulados',
      hint: 'Personas que guardan una publicación para volver a ella',
    },
    clicks: {
      label: 'Clics',
      periodLabel: 'Clics acumulados',
      hint: 'Pulsaciones en un enlace que sale de la publicación',
    },
    views: {
      label: 'Reproducciones',
      periodLabel: 'Reproducciones acumuladas',
      hint: 'Reproducciones de vídeo, contadas como las cuenta cada plataforma',
    },
    followers: {
      label: 'Seguidores',
      periodLabel: 'Seguidores actuales',
      hint: '',
    },
    published: {
      label: 'Publicaciones enviadas',
      periodLabel: 'Publicaciones enviadas',
      hint: '',
    },
  },

  sleeves: {
    platform: 'Plataforma',
    account: 'Cuenta',
    campaign: 'Campaña',
    format: 'Formato',
    theme: 'Tema',
    origin: 'Cómo se escribió',
    weekday: 'Día de la semana',
    quality: 'Banda de calidad',
  },

  units: {
    hours: '{{count}} h',
    daysHours: '{{days}} d {{hours}} h',
    elapsed: '+{{span}}',
    multiplier: '{{value}}×',
    percent: '{{value}} %',
    thousand: '{{value}} mil',
    million: '{{value}} M',
    deltaUp: '+{{value}}',
    deltaDown: '−{{value}}',
    aboutTheSame: 'aproximadamente igual',
    over: 'durante {{period}}',
    lastDays: 'los últimos {{count}} días',
    spanHours_one: '{{count}} hora',
    spanHours_other: '{{count}} horas',
    spanDays_one: '{{count}} día',
    spanDays_other: '{{count}} días',
    posts_one: '{{count}} publicación',
    posts_other: '{{count}} publicaciones',
    slot: '{{day}} {{hour}}',
    slotUtc: '{{day}} {{hour}} UTC',
    hourOfDay: '{{hour}}:00',
    none: '—',
  },

  tile: {
    verdictAbove: 'Por encima de lo habitual',
    verdictWithin: 'Normal para ti',
    verdictBelow: 'Por debajo de lo habitual',
    nothingToCompare: 'nada con que comparar',
    noTypicalYet: 'aún no hay valor habitual',
    vsDay: 'frente al {{day}}',
    vsTypical: 'frente a una publicación habitual tuya',
    vsTypicalAtAge:
      'frente a una publicación habitual tuya con la misma antigüedad',
    vsTypicalMultiple: '{{value}}× tu valor habitual',
  },

  scopeNote: {
    allTime: 'Desde siempre — no le afecta el periodo de arriba',
    allTimeWorkspace:
      'Desde siempre y todo el espacio de trabajo — no le afectan el periodo ni la campaña de arriba',
    ahead: 'Mirando hacia delante — no le afecta el periodo de arriba',
  },

  charts: {
    empty: 'Los datos aparecerán aquí',
    today: 'Hoy',
    published: 'Publicada',
    later: '{{span}} después',
    runningTotalAria: 'Total acumulado desde que se publicó la publicación',
    earnedEachHourAria:
      'Lo que ganó la publicación cada hora desde que se publicó',
    earnedEachDayAria:
      'Lo que ganó la publicación cada día desde que se publicó',
    legendThisStretch: 'este tramo',
    legendEachDay: 'cada día',
    legendStretchBefore: 'el tramo anterior',
    legendStretchTo: 'el tramo hasta el {{day}}',
    legendUsualRange: 'rango habitual',
    legendPublication: 'salió una publicación',
    trendAria: 'Total acumulado durante el periodo seleccionado',
    columnsAria: 'Cada día del periodo seleccionado',
    sleevesAria: 'Comparado durante el periodo: {{sleeves}}',
    decayAria:
      'Proporción de la interacción final de una publicación ganada cada hora desde que se publicó',
    publicationsAria_one: '{{count}} publicación enviada en este periodo',
    publicationsAria_other: '{{count}} publicaciones enviadas en este periodo',
    publicationMark: '{{title}} — {{account}}',
  },

  now: {
    title: 'Qué ha pasado',
    unavailableTitle: 'No se está midiendo nada en este espacio de trabajo',
    unavailableBody:
      'La analítica aún no está activada aquí. Todo lo demás — planificar, generar, programar, publicar — funciona exactamente igual que ahora, y en cuanto se conecte la medición esto se rellenará con las publicaciones que ya has enviado.',
    emptyTitle: 'Aún no se ha medido nada',
    emptyBody:
      'En cuanto este espacio de trabajo empiece a publicar, aquí aparecerá lo que gana cada publicación — alcance, interacciones y cómo se compara con el tramo anterior.',
    emptyNarrowedTitle: 'Nada medido en {{platforms}}',
    emptyNarrowedBody:
      'Nada de lo publicado en estas plataformas ha dado cifras en este periodo. Elige TODAS LAS PLATAFORMAS arriba para contar el resto del espacio de trabajo.',
    errorTitle: 'No se ha podido cargar la analítica',
    errorBody:
      'El espacio de trabajo no se ve afectado — nada de aquí cambia lo que está programado o publicado. Inténtalo de nuevo en un momento.',
    noDataNothingOut:
      'Aún no hay datos: no ha salido nada en esta ventana, así que no hay nada que medir.',
    noDataNotReported_one:
      'Aún no hay datos: ha salido {{count}} publicación y todavía no ha reportado números. Las plataformas suelen tardar unas horas.',
    noDataNotReported_other:
      'Aún no hay datos: han salido {{count}} publicaciones y ninguna ha reportado números todavía. Las plataformas suelen tardar unas horas.',
    updated: 'Actualizado {{when}}',
  },

  sideBySide: {
    title: 'En paralelo',
    nothingTitle: 'Aún no hay nada que comparar',
    nothingBody:
      'Todo lo que se mide aquí cae bajo un mismo valor de {{dimension}}, así que no hay un segundo grupo con el que contrastarlo.',
    perPost: 'por publicación',
    vsBefore: 'frente a antes',
    dayByDay: '{{measure}} día a día',
    noCallTitle: 'Aún no se puede decidir',
    noCallBody:
      'Estos grupos están demasiado igualados, o con muy pocos datos, para decir que uno gana al otro.',
    thin_one:
      '{{sleeves}} tiene menos de cinco publicaciones medidas — se muestra, pero no se clasifica frente al resto.',
    thin_other:
      '{{sleeves}} tienen menos de cinco publicaciones medidas — se muestran, pero no se clasifican frente al resto.',
  },

  performers: {
    title: 'Destacadas y atípicas',
    by: 'Por',
    publishedColumn: 'Publicada',
    best: 'Mejores {{count}}',
    worst: 'Peores {{count}}',
    all: 'Todas ({{count}})',
    select: 'Seleccionar {{title}}',
    singleListNote:
      'Hay muy pocas publicaciones para tener dos extremos — estas son todas, las mejores primero.',
    nothingTitle: 'Nada que clasificar en este periodo',
    nothingPublishedBody:
      'Cuando salgan publicaciones, aquí aparecerán las que sostienen el periodo — y las que se quedan por detrás de lo que sueles hacer.',
    nothingReportedBody:
      'Las publicaciones de este periodo aún no han reportado lo suficiente para que ninguna clasificación signifique algo. Las plataformas suelen tardar unas horas.',
    unavailableTitle: 'No se está midiendo nada en este espacio de trabajo',
    unavailableBody:
      'En cuanto se conecte la medición, aquí aparecerán las publicaciones que sostienen el periodo — y las que se quedan por detrás de lo que sueles hacer.',
    emptyTitle: 'Nada que clasificar en este periodo',
    emptyBody:
      'No salió ninguna publicación en esta ventana. Amplía el periodo, o vuelve cuando se haya publicado la siguiente.',
    emptyNarrowedTitle: 'Nada en {{platforms}} que clasificar en este periodo',
    emptyNarrowedBody:
      'No se publicó nada en estas plataformas en este periodo. Amplía el periodo o elige más plataformas arriba.',
    errorTitle: 'No se han podido cargar las destacadas',
    errorBody:
      'El espacio de trabajo no se ve afectado — nada de aquí cambia lo que está programado o publicado. Inténtalo de nuevo en un momento.',
    reached: '{{reach}} alcanzadas',
    reachedCounting: '{{reach}} alcanzadas y sumando',
    periodShare: '{{share}} % del periodo',
    noTypicalBasis:
      'Aún no hay un valor habitual con el que contrastarlas, así que las barras se miden contra la mejor de la lista.',
    curveBasis:
      'Ajustado por antigüedad según cómo maduraron {{count}} publicaciones tuyas ya terminadas — tu propia curva, no una media del sector.',
    noCurveBasis:
      'No hay suficientes publicaciones tuyas que hayan terminado de ganar como para saber cómo maduran las tuyas, así que aquí nada está ajustado por antigüedad — mientras tanto, una tasa es la clasificación que se sostiene.',
    hidden_one:
      '{{count}} publicación más de este periodo quedó entre los dos extremos y no se muestra.',
    hidden_other:
      '{{count}} publicaciones más de este periodo quedaron entre los dos extremos y no se muestran.',
    withoutBaseline_one:
      '{{count}} publicación está en una plataforma con muy poco historial para contrastarla, así que aparece aquí por alcance bruto en vez de por un múltiplo.',
    withoutBaseline_other:
      '{{count}} publicaciones están en plataformas con muy poco historial para contrastarlas, así que aparecen aquí por alcance bruto en vez de por un múltiplo.',
    barBasis:
      'Cada barra es esta publicación frente a una publicación habitual tuya en la misma plataforma y con la misma antigüedad — tus propias publicaciones, no una media del sector.',
    updated: 'Actualizado {{when}}.',
    basis: {
      against_typical: 'Frente a tu valor habitual',
      reach: 'Alcance',
      engagement_rate: 'Tasa de interacción',
      interactions: 'Interacciones',
    },
  },

  criteria: {
    pace: {
      label: 'Frente a tu valor habitual',
      rawLabel: 'Frente a tu valor habitual',
      suffix: '',
      heldOut_one:
        'Una publicación es demasiado reciente para situarla frente a la curva.',
      heldOut_other:
        '{{count}} publicaciones son demasiado recientes para situarlas frente a la curva.',
    },
    reach: {
      label: 'Alcance al terminar',
      rawLabel: 'Alcance hasta ahora',
      suffix: '',
      heldOut_one:
        'Una publicación es demasiado reciente para proyectarla — casi nada ha llegado todavía.',
      heldOut_other:
        '{{count}} publicaciones son demasiado recientes para proyectarlas — casi nada ha llegado todavía.',
    },
    engagement_rate: {
      label: 'Tasa de interacción',
      rawLabel: 'Tasa de interacción',
      suffix: '',
      heldOut_one:
        'Una publicación la vio muy poca gente como para que una tasa signifique algo, o no reportó interacciones.',
      heldOut_other:
        '{{count}} publicaciones las vio muy poca gente como para que una tasa signifique algo, o no reportaron interacciones.',
    },
  },

  quality: {
    title: 'Calidad frente a resultados',
    qualifier: 'para cada publicación que puntuamos',
    didBetterOn: 'Fue mejor en',
    medianPerBand: '{{criterion}}, mediana por banda',
    elements: {
      overall: {
        label: 'Global',
        blurb: 'La puntuación ponderada que suman los cuatro elementos',
        strong: '80–100 %',
        workable: '50–79 %',
        weak: 'Menos de 50 %',
      },
      correctness: {
        label: 'Corrección',
        blurb: 'Cierto y bien formado',
        strong: '8–10',
        workable: '5–7',
        weak: 'Menos de 5',
      },
      clarity: {
        label: 'Claridad',
        blurb: 'Se entiende a la primera',
        strong: '8–10',
        workable: '5–7',
        weak: 'Menos de 5',
      },
      engagement: {
        label: 'Interacción',
        blurb: 'Hace que la gente se interese y actúe',
        strong: '8–10',
        workable: '5–7',
        weak: 'Menos de 5',
      },
      delivery: {
        label: 'Entrega',
        blurb: 'Encaja con el canal',
        strong: '8–10',
        workable: '5–7',
        weak: 'Menos de 5',
      },
    },
    spread: {
      singleBand: 'Todas puntuaron igual',
      thinBands: 'Muy pocas en cada banda',
      tracks: 'Las publicaciones {{band}} van mejor',
      inverted: 'Las publicaciones {{band}} van mejor',
      flat: 'Sin diferencia',
    },
    band: {
      range: '{{range}} · {{posts}}',
      nothingScored: 'Nada puntuado aquí',
      tooFew: 'Menos de {{minimum}} situadas — muy pocas para comparar',
    },
    gateTitle_one: '{{count}} publicación puntuada hasta ahora',
    gateTitle_other: '{{count}} publicaciones puntuadas hasta ahora',
    gateBody:
      'Contrastar la puntuación con los resultados necesita unas cuantas publicaciones en cada banda para significar algo — {{minimum}} es donde empieza, y cada publicación que puntúes a partir de ahora cuenta para ello.',
    coverageWithReasons:
      '{{comparable}} de las {{total}} publicaciones enviadas aquí se pueden comparar — {{reasons}}.',
    coveragePlain:
      '{{comparable}} de las {{total}} publicaciones enviadas aquí se pueden comparar.',
    reasonUnscored: '{{count}} nunca se puntuaron',
    reasonAwaiting: '{{count}} siguen esperando a las plataformas',
    reasonStale:
      '{{count}} se editaron tras puntuarlas, así que la puntuación es de otro texto',
    medianBasis:
      'Cada banda muestra su mediana, así que una publicación que llegó inusualmente lejos no puede sostenerla.',
    correctedBasis:
      'Las antigüedades se corrigen según cómo maduraron {{count}} publicaciones tuyas ya terminadas.',
    uncorrectedBasis:
      'No hay suficientes publicaciones tuyas que hayan terminado de ganar como para corregir por antigüedad, así que las bandas se comparan por una tasa.',
    advisoryBasis: 'La puntuación es orientativa y se hizo antes de publicar.',
    emptyNothingScoredTitle: 'Aún no se ha puntuado nada',
    emptyNothingScoredBody:
      'Nada de aquí ha pasado por una revisión de calidad, así que no hay nada que contrastar con lo que ganaron estas publicaciones. Puntúa unas cuantas desde el editor y esto se rellenará solo.',
    emptyStaleTitle: 'Todas las puntuaciones están desfasadas',
    emptyStaleBody:
      'Todas las publicaciones puntuadas de aquí se han editado después, así que cada puntuación describe un texto que nunca salió. Vuelve a puntuar cualquiera de ellas y regresará a la comparación.',
    emptyAwaitingTitle: 'Puntuadas, aún sin respuesta',
    emptyAwaitingBody_one:
      'Ha salido {{count}} publicación puntuada y las plataformas todavía no han reportado sobre ella. Suele tardar unas horas.',
    emptyAwaitingBody_other:
      'Han salido {{count}} publicaciones puntuadas y las plataformas todavía no han reportado sobre ellas. Suele tardar unas horas.',
    emptyThinTitle: 'Nada ha reportado lo suficiente para comparar',
    emptyThinBody:
      'Las publicaciones puntuadas de aquí no han reportado lo suficiente para que ninguna comparación signifique algo todavía.',
    emptyTitle: 'Aún no hay nada que comparar',
    emptyBody: 'Aquí todavía no hay nada que comparar.',
  },

  outcomes: {
    title: 'Resultados',
    noGoalTitle: 'Aún no hay un objetivo para esto',
    noGoalBody:
      'Nombrar lo que quieres conseguir — visitas a una página, consultas, altas — permite leer todo lo de arriba en función de ello y no por sí solo.',
    noTarget: 'No hay meta fijada para {{goal}}',
    setOne: 'Fijar una',
    connectSource: 'Conectar una fuente',
    notCountedTitle: '{{goal}} todavía no se está contando',
    notCountedBody:
      'Las publicaciones que apuntan ahí siguen saliendo, y en cuanto se conecte una señal esto se rellenará con los enlaces que ya marcamos.',
    overThePeriod: '{{goal}} durante el periodo',
    measuredBy: 'Medido por {{signal}}',
    measuredByAt: 'Medido por {{signal}} · {{destination}}',
    mostlyFrom: 'Sobre todo de',
    towardsTargetWeek:
      '{{value}} de las {{target}} por semana a las que apuntas. La línea discontinua es la meta; la continua es el total acumulado.',
    towardsTargetMonth:
      '{{value}} de las {{target}} por mes a las que apuntas. La línea discontinua es la meta; la continua es el total acumulado.',
    soFar:
      '{{value}} hasta ahora. La línea es un total acumulado, así que termina en la cifra de arriba.',
    signalNoun: {
      unmeasured: 'aún no se puede medir',
      clicks: 'clics en el enlace',
      sessions: 'visitas que llegaron desde una publicación',
      conversions: 'conversiones que reportó tu sitio web',
    },
    signalShort: {
      unmeasured: 'sin medir',
      clicks: 'clics en enlaces',
      sessions: 'visitas al sitio',
      conversions: 'objetivos reportados',
    },
    signalBadge: {
      unmeasured: 'Nada conectado',
      clicks: 'Solo clics en enlaces',
      sessions: 'Tu sitio web está conectado',
      conversions: 'Tu sitio web reporta sus propios objetivos',
    },
  },

  learned: {
    title: 'Lo que hemos aprendido',
    metric: 'Métrica',
    metrics: {
      reach: 'Alcance',
      interactions: 'Interacciones',
      saves: 'Guardados',
    },
    measuredPosts_one: '{{count}} publicación medida',
    measuredPosts_other: '{{count}} publicaciones medidas',
    whenPostsLand: 'Cuándo aterrizan tus publicaciones',
    howLongAPostLives: 'Cuánto vive una publicación',
    strongestSlot: 'Tu mejor franja es <1>{{slot}}</1>, a partir de {{posts}}.',
    slotsBasis:
      'A partir de {{posts}} en todas las horas en las que has publicado. Cuanto más oscuro, mejor.',
    slotsBasisUtc:
      'A partir de {{posts}}, por mediana de {{metric}}. Cuanto más oscuro, mejor; un cuadro en blanco es una hora en la que nunca has publicado. Las horas están en UTC.',
    slotsAriaStrongest:
      'Mediana de {{metric}} por hora de publicación. Mejor franja: {{slot}}, a partir de {{posts}}.',
    slotsAria:
      'Mediana de {{metric}} por hora de publicación, sobre {{posts}}.',
    slotCell: '{{slot}} · {{posts}} · {{value}} de mediana de {{metric}}',
    slotsNotYetTitle: 'Aún no hay publicaciones suficientes para decirlo',
    slotsNotYetBody:
      'Esto necesita unas treinta publicaciones medidas repartidas en horas distintas. Hasta entonces, cualquier cuadrícula sería un cara o cruz disfrazado de gráfico.',
    slotsNotYetBodyWithCount:
      'Esto necesita unas treinta publicaciones medidas repartidas en horas distintas. Tienes {{count}}. Hasta entonces, cualquier cuadrícula sería un cara o cruz disfrazado de gráfico.',
    slotsInsufficientBody:
      'Una cuadrícula dibujada con un puñado de publicaciones se ve exactamente igual que una dibujada con cientos, y alguien reorganizará su semana en torno a ella. Esto se rellenará cuando hayas publicado en unas cuantas horas distintas.',
    halfLife:
      'La mitad de todo lo que gana una publicación llega en las primeras <1>{{span}}</1>.',
    milestone: 'a las {{span}}',
    lifespanNotYetTitle: 'Aún no hay publicaciones terminadas suficientes',
    lifespanNotYetBody:
      'Una vida útil necesita publicaciones que hayan dejado de ganar, lo que lleva unas semanas de publicación.',
    lifespanNoneSettled:
      'Esto necesita publicaciones que hayan dejado de ganar, lo que lleva unas semanas de publicación — ninguna de las tuyas ha llegado a su fin todavía.',
    lifespanSomeSettled_one:
      'Esto necesita publicaciones que hayan dejado de ganar, lo que lleva unas semanas de publicación — {{count}} de las tuyas lo ha hecho hasta ahora.',
    lifespanSomeSettled_other:
      'Esto necesita publicaciones que hayan dejado de ganar, lo que lleva unas semanas de publicación — {{count}} de las tuyas lo han hecho hasta ahora.',
    lifespanBasis:
      'A partir de {{count}} publicaciones que han llegado a su fin. El hueco entre la primera y la última marca es tu ventana para actuar sobre una publicación — después, su cifra queda fijada. También es el motivo por el que una publicación de menos de un día se muestra como que sigue contando en vez de clasificarse.',
    lifespanBasisWorkspace:
      'A partir de {{count}} publicaciones que han llegado a su fin. Siempre alcance, sea cual sea la métrica de la tarjeta — la curva es la forma del alcance de una publicación a lo largo del tiempo, como proporción de lo que acabó ganando.',
    whatWorks: 'Lo que funciona',
    whatsFading: 'Lo que se está apagando',
    againstMedian: 'Frente a tu mediana.',
    changeOver: 'Cambio en los últimos {{window}}.',
    trendWindowDays: '{{count}} días',
    nothingSeparated: 'Todavía nada se ha separado del resto.',
    nothingFallen: 'Todavía nada ha decaído.',
    patternSupport_one: '{{count}} publicación',
    patternSupport_other: '{{count}} publicaciones',
    patternTooFew: '{{support}} — muy pocas para apoyarse en ellas',
    patternBasis: '{{support}} · {{metric}}',
    noPatternsTitle: 'Aún no hay hábitos que comparar',
    noPatternsBody:
      'Los patrones salen de dividir tus publicaciones por lo que tienen en común — formato, longitud, enlaces, horario, plataforma — y cada lado de la división necesita publicaciones suficientes para significar algo.',
    unavailableTitle: 'No se está midiendo nada en este espacio de trabajo',
    unavailableBody:
      'En cuanto se conecte la medición, aquí aparecerán las horas en las que publicas, cuánto tiempo sigue ganando una publicación y qué tienen en común tus publicaciones — todo a partir de las que ya has enviado.',
    emptyTitle: 'Aún no se ha publicado nada',
    emptyBody:
      'Estas son lecciones sacadas de tus propias publicaciones, así que empiezan el día que tengas algunas. No hay nada que configurar.',
    emptyNarrowedTitle: 'Aún no se ha publicado nada en {{platforms}}',
    emptyNarrowedBody:
      'Estas lecciones salen solo de las publicaciones en estas plataformas, y allí no ha salido ninguna. Elige TODAS LAS PLATAFORMAS arriba para aprender del resto del espacio de trabajo.',
    narrowedThin:
      'Contado solo en {{platforms}}. Una lección necesita suficientes publicaciones en estas plataformas por sí solas, así que elegir más arriba puede recuperar una sección.',
    errorTitle: 'No se ha podido cargar lo que hemos aprendido',
    errorBody:
      'El espacio de trabajo no se ve afectado — nada de aquí cambia lo que está programado o publicado. Inténtalo de nuevo en un momento.',
    since: 'desde {{date}}',
    updated: 'Actualizado {{when}}.',
  },

  next: {
    title: 'Qué viene ahora',
    nothingTitle: 'Ahora mismo no necesitas hacer nada',
    nothingBody:
      'Cuando una franja se quede sin usar, una publicación supere lo habitual o una cuenta se quede callada, aparecerá aquí.',
    pacing: '{{published}} de {{planned}} publicaciones {{period}}',
    behind: 'Por detrás del plan',
    onPlan: 'Según el plan',
    projected:
      'A este ritmo esta campaña termina el {{date}} con unas {{projected}} publicaciones.',
    projectedAgainstTarget:
      'A este ritmo esta campaña termina el {{date}} con unas {{projected}} publicaciones frente a un plan de {{target}}.',
    evergreen:
      'Esta campaña sigue hasta que la pares, así que esto es un ritmo y no una meta final.',
  },

  scopeBar: {
    period: 'Periodo',
    compare: 'Comparar',
    by: 'Por',
    selectAll: 'Seleccionar todas',
    deselectAll: 'Deseleccionar todas',
    allPlatforms: 'Todas las plataformas',
    accounts_one: '{{count}} cuenta',
    accounts_other: '{{count}} cuentas',
    platformAccounts: '{{platform}} — {{accounts}}',
    platformNoAccount: '{{platform}} — ninguna cuenta conectada',
    platformAccountsLabel: '{{platform}}, {{accounts}}',
    platformNoAccountLabel: '{{platform}}, ninguna cuenta conectada',
    control: {
      period: 'Periodo',
      platforms: 'Plataformas',
    },
    assistantChanged: 'El asistente cambió {{controls}}',
    otherCampaign: 'Una campaña que ya no aparece',
    range: '{{from}} – {{to}}',
    axisTime: 'Ahora frente a antes',
    axisSleeve: 'En paralelo',
  },

  surface: {
    title: 'Analítica',
    unavailableTitle: 'No se está midiendo nada en este espacio de trabajo',
    unavailableBody:
      'La analítica aún no está activada aquí. Todo lo demás — planificar, generar, programar, publicar — funciona exactamente igual que ahora, y en cuanto se conecte la medición estas pantallas se rellenarán con las publicaciones que ya has enviado.',
    errorTitle: 'No se ha podido cargar la analítica',
    errorBodyCampaign:
      'La campaña no se ve afectada — nada de aquí cambia lo que está programado o publicado. Inténtalo de nuevo en un momento.',
    errorBodyWorkspace:
      'El espacio de trabajo no se ve afectado — nada de aquí cambia lo que está programado o publicado. Inténtalo de nuevo en un momento.',
    coldTitle: 'Aún no se ha medido nada',
    coldNothingPublished:
      'En cuanto esto empiece a publicar, aquí aparecerá lo que gana cada publicación — alcance, interacciones y cómo se compara con lo que sueles hacer.',
    coldNotReported_one:
      'Ha salido {{count}} publicación y las plataformas todavía no han reportado sobre ella. Suele tardar unas horas.',
    coldNotReported_other:
      'Han salido {{count}} publicaciones y las plataformas todavía no han reportado sobre ellas. Suele tardar unas horas.',
  },

  post: {
    identityTitle: 'La publicación',
    openOn: 'Abrir en {{platform}}',
    published: 'Publicada',
    scheduled: 'Programada',
    notScheduled: 'Sin programar',
    noDateSet: 'Sin fecha',
    campaign: 'Campaña',
    overviewTitle: 'Resumen de rendimiento',
    overviewWindow: 'en sus primeras {{span}}',
    unpublishedTitle: 'Aún no hay nada que medir',
    unpublishedBody:
      'Esta publicación no ha salido. Cuando salga, aquí aparecerá lo que gane — y cómo se compara con lo que suelen hacer tus publicaciones.',
    silentTitle: 'La plataforma todavía no ha dicho nada',
    silentBody:
      'Esta publicación ya ha salido. La plataforma no ha reportado ningún número sobre ella — eso suele tardar unas horas.',
    reading: 'Cómo leerlo',
    readingTotal: 'Total acumulado',
    readingHour: 'Por hora',
    readingDay: 'Por día',
    noHistoryLabel: 'No hay historial registrado de esta publicación',
    noHistoryBasis:
      '{{measure}} se recogió como total. No se registró cómo llegó, así que no hay forma que dibujar.',
    noHourReached: 'Ninguna hora alcanzó a suficiente gente para dividir',
    noDayReached: 'Ningún día alcanzó a suficiente gente para dividir',
    tryTheDay:
      'Prueba con el día, o con el total acumulado — ambos tienen suficiente detrás para dividir.',
    peakPerHour: 'máximo {{value}} por hora',
    peakPerDay: 'máximo {{value}} por día',
    legendRateTotal:
      'La tasa hasta ahora — interacciones divididas entre toda la gente alcanzada hasta ese punto.',
    legendTotal:
      'Total acumulado desde la publicación — la línea termina en la cifra de arriba.',
    legendRateHour:
      'La tasa a la que iba cada hora. Un hueco es una hora sin nada — o demasiado tranquila para dividir.',
    legendRateDay:
      'La tasa a la que iba cada día. Un hueco es un día sin nada — o demasiado tranquilo para dividir.',
    legendHour: 'Lo que llegó en cada hora. Un hueco es una hora sin nada.',
    legendDay: 'Lo que llegó en cada día. Un hueco es un día sin nada.',
    maturityCounting:
      'Sigue contando — cada cifra de arriba es un suelo y no un resultado.',
    maturitySettling: 'Ha pasado su punto álgido y todavía suma un poco.',
    maturityFinal:
      'Esta publicación ha dejado de ganar — estos números son definitivos.',
    percentile: 'Mejor que el {{percentile}} % de tus publicaciones.',
    percentileBasis:
      'Clasificada por alcance frente a {{count}} publicaciones medidas',
    updated: 'Actualizado {{when}}',
  },
}

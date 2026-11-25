import type { Translation } from '../en'

export const series: Translation['series'] = {
  library: {
    add: 'Añadir serie',
    addHint: 'Otra cosa que este espacio de trabajo hace una y otra vez.',
    writeYourOwn: 'Escribe la tuya',
    writeYourOwnHint: 'Una serie propia, desde una página en blanco.',
    starterGroupTitle: 'Tres para empezar',
    starterGroupBody:
      'Cada una es un ejemplo trabajado de lo más difícil de inventar desde un formulario en blanco: la receta. Toma una y reescríbela hasta que sea tuya.',
    noRecipe:
      'Aún no tiene receta. Agrupa publicaciones y no escribe nada por sí sola.',
    toMakeOne: 'Para hacer una,',
  },
  rhythm: {
    occasional: 'Ocasional',
    perWeek_one: 'Una vez por semana',
    perWeek_other: '{{formatted}} veces por semana',
    perMonth_one: 'Una vez al mes',
    perMonth_other: '{{formatted}} veces al mes',
    perWeeksEvery_one: 'Una vez cada {{every}} semanas',
    perWeeksEvery_other: '{{formatted}} veces cada {{every}} semanas',
    perMonthsEvery_one: 'Una vez cada {{every}} meses',
    perMonthsEvery_other: '{{formatted}} veces cada {{every}} meses',
    everyDay: 'Cada {{day}}',
    everyWeeksOn_one: 'Cada semana, el {{day}}',
    everyWeeksOn_other: 'Cada {{formatted}} semanas, el {{day}}',
    everyWeekOption_one: 'cada semana',
    everyWeekOption_other: 'cada {{formatted}} semanas',
    everyMonthOption_one: 'cada mes',
    everyMonthOption_other: 'cada {{formatted}} meses',
    anyDay: 'cualquier día',
    onDay: 'el {{day}}',
    everyLabel: 'Cada cuánto',
    dayLabel: 'Qué día',
  },
  supply: {
    selfOption: 'Aporta su propio tema',
    ideaOption: 'Espera una idea',
    selfLine: 'Aporta su propio tema',
    ideaLine: 'Espera una idea',
  },
  usage: '{{drafts}} en borrador, {{published}} publicadas',
  mark: 'Hecha para la serie «{{name}}»',
  plan: {
    noGoal:
      'Esta campaña no tiene objetivo de publicaciones, así que no hay nada con lo que comparar estas series.',
    ok: '{{total}} publicaciones previstas · {{claimed}} de series · {{open}} libres',
    over: '{{total}} publicaciones previstas y las series reclaman {{claimed}}: {{over}} más de las que la campaña tiene previstas.',
    undated:
      '{{total}} publicaciones por período. Define las fechas de la campaña y las series reservarán sus huecos.',
  },
  campaign: {
    title: 'Series',
    empty:
      'Aquí no se ejecuta ninguna serie. Cada publicación se planifica una a una.',
    add: 'Añadir serie',
    addTitle: 'Añadir una serie',
    addNoLibrary:
      'El espacio de trabajo aún no tiene series. Escribe una y esta campaña podrá ejecutarla.',
    addNone: 'Todas las series del espacio de trabajo ya se ejecutan aquí.',
    writeNew: 'Escribir una serie nueva',
    cancel: 'Cancelar',
    howOften: 'Con qué frecuencia',
    claim_one: '{{formatted}} publicación en esta campaña',
    claim_other: '{{formatted}} publicaciones en esta campaña',
    claimsNone: 'sin huecos fijos',
    localOnly: 'solo en esta campaña',
    madeHere: 'Creada en esta campaña',
    stop: 'Dejar de ejecutar',
    edit: 'Editar serie',
    promote: 'Añadir a la biblioteca',
    done: 'Hecho',
  },
  detail: {
    back: 'Volver a series',
    deleted: '{{name}} eliminada',
    notFoundHeader: 'No existe esa serie',
  },
  editor: {
    titleNew: 'Una serie nueva',
    titleEdit: 'Esta serie',
    intro:
      'Una serie es una instrucción permanente: cómo se llama y cómo se construye la siguiente. Escribe la receta como se la explicarías a quien te sustituya.',
    identityCard: 'Qué es',
    nameLabel: 'Nombre',
    nameHint:
      'Aquello por lo que un lector la reconocería. Si nadie la llamaría de ninguna manera, es un tema y no una serie.',
    namePlaceholder: 'p. ej. Resumen semanal de noticias',
    promiseLabel: 'La promesa',
    promiseHint: 'Una línea: qué se lleva alguien cada vez que se publica.',
    promisePlaceholder:
      'p. ej. La semana en un minuto, con lo que de verdad importa',
    recipeCard: 'Cómo se construye',
    recipeHint:
      'La estructura, con tus palabras. Es lo que hace que la décima salga tan bien como la primera, y lo que un generador puede seguir.',
    recipePlaceholder:
      'p. ej. Abre con la noticia más importante. Tres más, una línea cada una. Cierra con lo que habrá que vigilar la semana que viene.',
    runningCard: 'Cómo se ejecuta',
    supplyLabel: 'De dónde sale el tema',
    supplyHint:
      'Una fecha o las noticias de la semana son un tema que la serie ya tiene. Un perfil no: espera a que alguien nombre a una persona.',
    formatLabel: 'Forma',
    formatHint:
      'La forma que toman sus publicaciones. Las publicaciones la heredan.',
    rhythmLabel: 'Ritmo sugerido',
    rhythmHint:
      'Un punto de partida cuando una campaña la adopta. Cada campaña define el suyo, así que dos pueden ejecutarla a ritmos distintos.',
    needsName: 'Ponle nombre a la serie',
    create: 'Crear serie',
    dangerNoun: 'serie',
    deleteCost:
      'Las publicaciones ya escritas conservan su texto. Todas las campañas que la ejecutan se detienen y el plan recupera sus huecos.',
  },
  starters: {
    'this-day': {
      title: 'Un día como hoy en ___',
      body: 'Se ejecuta siempre sin que nadie la alimente: la fecha es el tema.',
      name: 'Un día como hoy en ___',
      promise: 'Algo que pasó hoy y por qué todavía importa.',
      recipe:
        'Busca un hecho fechado hoy en el sector. Dos párrafos breves de contexto: qué estaba en juego y qué cambió. Cierra con la lección que sigue vigente. Nunca más de un hecho.',
    },
    'weekly-digest': {
      title: 'Resumen semanal de noticias',
      body: 'El ritmo está en el nombre. Se alimenta sola y es el hábito más fácil de construir.',
      name: 'Resumen semanal de noticias',
      promise: 'La semana en un minuto, con lo que de verdad importa.',
      recipe:
        'Empieza por la noticia más importante y di sin rodeos por qué importa. Tres más, una línea cada una. Cierra con lo que habrá que vigilar la semana que viene. Sin enlaces en el cuerpo.',
    },
    people: {
      title: 'Gente que dejó huella',
      body: 'No puede ejecutarse hasta que alguien nombre a una persona: el ejemplo de serie que alimenta la cola de ideas.',
      name: 'Gente que dejó huella',
      promise: 'Una persona, una decisión y algo que cambió para todos.',
      recipe:
        'Abre con la decisión, no con la biografía. Cuenta cómo era el mundo antes y después. Una frase sobre en qué se equivocó, para que se lea como una persona y no como una estatua.',
    },
  },
}

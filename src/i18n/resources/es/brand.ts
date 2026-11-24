import type { Translation } from '../en'

export const brand: Translation['brand'] = {
  selection: {
    select: 'Seleccionar «{{name}}»',
    fact_one: '{{formatted}} dato seleccionado',
    fact_other: '{{formatted}} datos seleccionados',
    selectAll: 'Seleccionar todos los datos mostrados',
    clearAll: 'Quitar la selección',
    clear: 'QUITAR',
    remove: 'ELIMINAR',
  },
  binding: {
    voice: 'Voz',
    audience: 'Audiencia',
    campaignVoiceHint:
      'La voz en la que escribe esta campaña. Las publicaciones se abren con ella y pueden cambiarse una a una; déjala sin definir para usar la del espacio de trabajo.',
    campaignAudienceHint:
      'A quién se dirige esta campaña. Una publicación que se dirija a otra persona lo indica en la propia publicación.',
    noVoice: 'Sin voz',
    noAudience: 'Sin audiencia',
    sourcePost: 'Definida en esta publicación',
    sourceCampaign: 'De la campaña',
    sourceLibrary: 'La predeterminada del espacio de trabajo',
    reset: 'RESTABLECER',
    resetHint: 'Volver a lo que dice la campaña',
    emptyTitle: 'Voz y audiencia',
    emptyBody:
      'Este espacio de trabajo aún no tiene voces ni audiencias. Se escriben una vez y todas las campañas se basan en ellas.',
    emptyShort: 'Este espacio de trabajo aún no tiene voces ni audiencias.',
    openBrand: 'Abrir Fundamentos',
    saveError: 'No se pudo guardar la voz de la campaña',
  },

  sections: {
    voices: {
      label: 'Voces',
      description:
        'Una voz son de tres a ocho publicaciones reales que te habría gustado escribir, y la aplicación escribe a partir de ellas y no de un adjetivo. Tener varias es lo normal: el comentario sarcástico y la página de empresa no son dos tonos de una misma personalidad.',
      whenEmpty: 'Sin voz propia: todo lo que se genera aquí suena a generado.',
    },
    audiences: {
      label: 'Audiencias',
      description:
        'A quién van dirigidas las publicaciones, descrito por lo que se deriva de ello: dónde leen, qué les hace pasar de largo y qué necesitan antes de creerse una cifra. Cada campaña pregunta para quién es esto, y la respuesta sale de aquí.',
      whenEmpty: 'No se escribe a nadie en particular.',
    },
    guardrails: {
      label: 'Límites',
      description:
        'Qué es cierto, qué se puede afirmar y qué no se puede afirmar nunca. Son las reglas de las que nadie se libra: valen para toda publicación generada, sea cual sea la voz que la escribió, y cuanto más convincente es la voz, más convincente resulta la invención que estas reglas existen para evitar.',
      whenEmpty:
        'Nada está prohibido. Cualquier voz de aquí puede prometer lo que sea.',
    },
    facts: {
      label: 'Datos',
      description:
        'Lo que es cierto —de este negocio, de los problemas que tiene quien lo lee y de los huecos que nadie ha ocupado— afirmación por afirmación, con su procedencia y la fecha en la que deja de poder repetirse. Toda cifra que afirme una publicación generada sale de aquí, o es inventada.',
      whenEmpty:
        'No se afirma nada como cierto. Toda cifra de toda publicación es invención, escrita con aplomo.',
    },
    series: {
      label: 'Series',
      description:
        'Lo que este espacio de trabajo hace una y otra vez: un resumen semanal, un perfil dos veces al mes. Cada una es un nombre que el público reconoce y una receta para construir la siguiente, de modo que la décima salga tan bien como la primera y nadie empiece desde una página en blanco.',
      whenEmpty:
        'Nada se repite. Cada publicación empieza de cero y nada puede medirse como serie.',
    },
    look: {
      label: 'Aspecto',
      description:
        'Logotipos con una función declarada, colores con roles, tipografía e imágenes de referencia. Lo suficiente para que la aplicación cree una imagen con tu aspecto sin tener que preguntar cuál de los cuatro archivos va en la esquina.',
      whenEmpty:
        'Sin logotipo, sin colores, sin tipografía: las imágenes generadas quedan donde las deje el modelo.',
    },
    templates: {
      label: 'Plantillas',
      description:
        'Un marco a lienzo completo por plataforma y por proporción, no un motor de composición, y por eso aquí nada se readapta. Un conjunto al que le falte una proporción en la que su plataforma publica no sirve allí, así que la pantalla empieza por las plataformas y no por los conjuntos.',
      whenEmpty:
        'Las imágenes salen desnudas. Nada las marca como tuyas una vez que han salido de la aplicación.',
    },
  },

  factsLedger: {
    duplicate: 'Este espacio de trabajo ya tiene esa afirmación como dato.',
    gone: 'Alguien eliminó este dato mientras estaba abierto. El registro se ha actualizado.',
    saveFailed: 'No se pudo guardar el dato. Inténtalo de nuevo.',
    table: {
      statement: 'Afirmación',
      about: 'Sobre',
      kind: 'Tipo',
      source: 'Fuente',
      added: 'Añadido',
      checked: 'Comprobado',
      expires: 'Caduca',
      notWritten: 'Sin escribir todavía',
      nobodySaid: 'nadie lo dijo',
      never: 'nunca',
      noExpiry: 'no caduca',
      expiredOn: 'Caducó el {{date}}',
      expiresOn: 'Caduca el {{date}}',
      remove: 'Eliminar «{{statement}}»',
      removeUnnamed: 'Eliminar este dato',
    },
    remove: {
      titleNamed: '¿Eliminar «{{statement}}»?',
      title_one: '¿Eliminar {{formatted}} dato?',
      title_other: '¿Eliminar {{formatted}} datos?',
      body_one:
        'Las publicaciones que se escriban a partir de ahora no podrán afirmarlo. No se puede recuperar.',
      body_other:
        'Las publicaciones que se escriban a partir de ahora no podrán afirmarlos. No se pueden recuperar.',
      keep_one: 'CONSERVARLO',
      keep_other: 'CONSERVARLOS',
      confirm_one: 'ELIMINAR DATO',
      confirm_other: 'ELIMINAR {{formatted}} DATOS',
    },
  },
  facts: {
    samplesNone: 'sin ejemplos',
    samples_one: '{{count}} ejemplo',
    samples_other: '{{count}} ejemplos',
    usagePublished: '{{count}} publicadas',
    usageDrafts: '{{count}} en borrador',
    usageNever: 'nunca usada',
    separator: ', ',
  },

  shell: {
    default: 'predeterminada',
    chipMore: '+{{count}} más',
    origin: {
      blank: 'Escrita aquí',
      template: 'De una plantilla',
      website: 'Leída del sitio web',
      posts: 'Aprendida de publicaciones publicadas',
      promoted: 'Guardada de una publicación',
      document: 'Sacada de un documento',
      questions: 'De tus respuestas',
    },
    originPostCount_one: '{{count}} publicación',
    originPostCount_other: '{{count}} publicaciones',
    offer: {
      dismiss: 'No volver a ofrecer esto',
      title: 'Rellénalo con lo que ya tienes',
      body: 'Una sola pasada rellena {{fills}}: desde tu sitio web, un documento que ya tengas o unas cuantas preguntas. Tus propias palabras y no una plantilla, y ves todo lo que propone antes de que se guarde nada.',
      website: {
        title: 'Leerlo de tu sitio web',
        body: 'Muestras de voz de tus propios textos, el aviso legal que ya publicas y los datos de producto que respaldan cada afirmación.',
      },
      document: {
        title: 'Sacarlo de un documento',
        body: 'Un dosier de marca, un PDF de tono de voz, una guía de estilo antigua. Da igual en qué se escribiera: funciona igual de bien que el sitio web.',
      },
      questions: {
        title: 'Responder unas cuantas preguntas',
        body: 'Para cuando no hay nada escrito en ningún sitio. Ogen lo redacta contigo y tú lo corriges.',
      },
      fills: {
        voices: 'voces',
        audiences: 'audiencias',
        guardrails: 'límites',
        facts: 'los datos',
      },
    },
  },

  distill: {
    cancel: 'CANCELAR',
    offer: {
      or: 'O',
      resumeReading: 'Leyendo {{what}}',
      resumeReady: '{{what}} ya está leído: revisa lo que propone',
      resumeReadingBody:
        'Sigue sin ti. Ábrelo para verlo, o vuelve cuando Ogen avise de que está listo.',
      resumeReadyBody:
        'No se guarda nada en tus Fundamentos hasta que lo hayas revisado.',
      resumeFiles_one: '{{count}} archivo',
      resumeFiles_other: '{{count}} archivos',
      resumeAnswers: 'Tus respuestas',
    },
    website: {
      label: 'Tu sitio web',
      placeholder: 'acme.com',
      invalid: 'Eso no parece una dirección web.',
      what: 'Leemos hasta diez páginas: inicio, quiénes sois, lo que vendes, precios, condiciones y un par de publicaciones recientes. Después se quedan en Recursos, como cualquier página que añadas.',
      read: 'LEER EL SITIO',
    },
    document: {
      formats:
        'PDF, Word, PowerPoint, Excel, OpenDocument, EPUB, Markdown, correo, audio, imágenes',
      inAssets: 'Ya en Recursos',
      search: 'Buscar en tus recursos',
      none: 'Todavía no hay nada en Recursos: suelta un archivo arriba.',
      noMatch: 'Nada en Recursos coincide con eso.',
      chosen_one: '{{count}} elegido',
      chosen_other: '{{count}} elegidos',
      read_one: 'LEER {{count}} ARCHIVO',
      read_other: 'LEER {{count}} ARCHIVOS',
      uploading: 'subiendo {{percent}} %',
      processing: 'leyendo',
      ready: 'listo',
      uploadFailed: 'no se pudo subir',
    },
    refusal: {
      invalidUrl:
        'Esa dirección no se puede leer: tiene que ser un sitio web público.',
      scrapingUnavailable:
        'Aquí todavía no está configurada la lectura de sitios web.',
      gateOff: 'Tu plan no incluye leer una marca.',
      unavailable:
        'Leer una marca no está disponible ahora mismo. Vuelve a intentarlo en un minuto.',
      failed: 'No se ha podido empezar. Vuelve a intentarlo en un minuto.',
    },
    page: {
      reading: 'Leyendo {{what}}',
      draftingAnswers: 'Redactando a partir de tus respuestas',
      readOff: 'Lo que leímos en {{what}}',
      readIn: 'Lo que leímos en {{what}}',
      fromAnswers: 'Lo que redactamos con tus respuestas',
      missingHeader: 'No existe esa lectura',
      missingMessage:
        'Esta lectura no existe en este espacio de trabajo, o se ha eliminado.',
    },
    reading: {
      steps: {
        finding: 'Buscando las páginas',
        readingPages: 'Leyendo las páginas',
        readingFiles: 'Leyendo los archivos',
        drafting: 'Redactando voces, audiencias, límites y datos',
        checking: 'Comprobando cada línea con lo que escribiste',
        checkingAnswers: 'Comprobando cada línea con tus respuestas',
      },
      found_one: '{{count}} encontrada, {{chosen}} elegidas',
      found_other: '{{count}} encontradas, {{chosen}} elegidas',
      homepageOnly: 'el sitio no tenía mapa, así que solo la página de inicio',
      progress: '{{done}} de {{total}}',
      kind: {
        home: 'inicio',
        about: 'quiénes sois',
        product: 'lo que vendes',
        pricing: 'precios',
        legal: 'condiciones',
        article: 'una publicación',
      },
      reading: 'leyendo',
      truncated: 'leída en parte',
      overLimit: 'por encima de tu límite de páginas',
      thin: 'demasiado poco texto',
      timedOut: 'tardó demasiado',
      failed: 'no se pudo leer',
      leave:
        'Esto tarda unos minutos. Puedes irte: sigue en marcha, y Ogen te avisa cuando esté listo para revisarlo. No se guarda nada en tus Fundamentos hasta que tú lo digas.',
      pagesLand:
        'Las páginas llegan a Recursos a medida que se leen, así que el asistente también puede buscar en ellas. Volver a leer el sitio más adelante las actualiza en lugar de añadir copias.',
    },
    count: {
      voices_one: '{{count}} voz',
      voices_other: '{{count}} voces',
      audiences_one: '{{count}} audiencia',
      audiences_other: '{{count}} audiencias',
      lines_one: '{{count}} línea de límites',
      lines_other: '{{count}} líneas de límites',
      words_one: '{{count}} palabra prohibida',
      words_other: '{{count}} palabras prohibidas',
      disclaimer: 'el aviso legal',
      facts_one: '{{count}} dato',
      facts_other: '{{count}} datos',
      positioning_one: '{{count}} línea sobre lo que te distingue',
      positioning_other: '{{count}} líneas sobre lo que te distingue',
    },
    summary: {
      fromPages_one: 'A partir de {{count}} página de {{site}}',
      fromPages_other: 'A partir de {{count}} páginas de {{site}}',
      fromFile: 'A partir de {{title}}',
      fromFiles_one: 'A partir de {{count}} archivo',
      fromFiles_other: 'A partir de {{count}} archivos',
      fromAnswers: 'A partir de tus respuestas',
      files_one: '{{count}} archivo',
      files_other: '{{count}} archivos',
      proposes:
        '{{from}}, Ogen propone {{what}}, y cada elemento cita de dónde salió. Conserva, cambia o descarta cada uno; solo se guarda lo que conservas.',
      nothing: '{{from}}, Ogen no encontró nada nuevo que proponer.',
      leftOut: 'Se dejó fuera: {{what}}.',
      leftDuplicate_one: '{{count}} elemento que ya tienes',
      leftDuplicate_other: '{{count}} elementos que ya tienes',
      leftUngrounded: {
        site_one:
          '{{count}} línea que no estaba palabra por palabra en el sitio',
        site_other:
          '{{count}} líneas que no estaban palabra por palabra en el sitio',
        files_one:
          '{{count}} línea que no estaba palabra por palabra en los archivos',
        files_other:
          '{{count}} líneas que no estaban palabra por palabra en los archivos',
        answers_one: '{{count}} línea que tus respuestas no respaldaban',
        answers_other: '{{count}} líneas que tus respuestas no respaldaban',
      },
      leftLimit_one:
        '{{count}} elemento por encima de los límites de tus Fundamentos',
      leftLimit_other:
        '{{count}} elementos por encima de los límites de tus Fundamentos',
      gaps: {
        website_one: 'Hay {{count}} cosa que el sitio no dijo.',
        website_other: 'Hay {{count}} cosas que el sitio no dijo.',
        document_one: 'Hay {{count}} cosa que los archivos no dijeron.',
        document_other: 'Hay {{count}} cosas que los archivos no dijeron.',
        questions_one: 'Hay {{count}} cosa que tus respuestas dejaron abierta.',
        questions_other:
          'Hay {{count}} cosas que tus respuestas dejaron abiertas.',
      },
      answer_one: 'Responder {{count}} pregunta',
      answer_other: 'Responder {{count}} preguntas',
    },
    gaps: {
      close: 'Cerrar las preguntas',
      title: {
        website_one: '{{count}} cosa que el sitio no dijo',
        website_other: '{{count}} cosas que el sitio no dijo',
        document_one: '{{count}} cosa que los archivos no dijeron',
        document_other: '{{count}} cosas que los archivos no dijeron',
        questions_one: '{{count}} cosa que tus respuestas dejaron abierta',
        questions_other: '{{count}} cosas que tus respuestas dejaron abiertas',
      },
      whyJoin: ': ',
      label_one:
        '{{formatted}} pregunta · las respuestas se rellenan al confirmarlas',
      label_other:
        '{{formatted}} preguntas · las respuestas se rellenan al confirmarlas',
      placeholder: 'Tu respuesta…',
      note: {
        website:
          'Responder vuelve a redactar la propuesta con tus respuestas, sin volver a leer el sitio. Lo que has conservado, descartado o editado hasta ahora se queda como lo dejaste.',
        document:
          'Responder vuelve a redactar la propuesta con tus respuestas, sin volver a leer los archivos. Lo que has conservado, descartado o editado hasta ahora se queda como lo dejaste.',
        questions:
          'Responder vuelve a redactar la propuesta con estas respuestas añadidas. Lo que has conservado, descartado o editado hasta ahora se queda como lo dejaste.',
      },
      ask: 'PREGUNTAR DE NUEVO CON ESTAS',
    },
    questions: {
      title: 'Unas cuantas preguntas',
      intro:
        'Responde lo que puedas y sáltate el resto. Ogen redacta voces, audiencias, límites y datos a partir de tus palabras, y tú los revisas antes de que se guarde nada, igual que al leer un sitio web.',
      placeholder: 'Sáltala, o dilo en una o dos líneas',
      unavailable:
        'No se han podido cargar las preguntas. Vuelve a intentarlo en un minuto.',
      answered: '{{answered}} de {{count}} respondidas',
      draft: 'REDACTARLO',
      starter: {
        q_offer: '¿Qué vendes y quién te lo compra?',
        q_three_words: 'Tres palabras que un cliente usaría sobre ti.',
        q_never_post: 'Una frase que nunca publicarías.',
        q_not_for: '¿Para quién no eres?',
        q_apart: '¿Qué haces tú que las alternativas no hacen?',
        q_proof: '¿Qué puedes demostrar?',
        q_legal: '¿Qué no te deja decir el departamento legal?',
        q_disclaimer: 'El aviso legal que ya usas, si lo hay.',
      },
    },
    source: {
      from: 'De',
      answer: 'tu respuesta',
      answerTo: 'tu respuesta a «{{question}}»',
    },
    review: {
      proposed_one: '{{count}} propuesta',
      proposed_other: '{{count}} propuestas',
      proposedNoneYet_one: '{{count}} propuesta · no tienes ninguna',
      proposedNoneYet_other: '{{count}} propuestas · no tienes ninguna',
      lines_one: '{{count}} línea',
      lines_other: '{{count}} líneas',
      words_one: '{{count}} palabra',
      words_other: '{{count}} palabras',
      qualifierJoin: ', ',
      keepOrDrop: 'Conservar o descartar',
      keep: 'Conservar',
      drop: 'Descartar',
      keepLine: 'Conservar «{{line}}»',
      dropLine: 'Descartar «{{line}}»',
      edit: 'EDITAR',
      done: 'HECHO',
      undo: 'DESHACER',
      dropped: 'descartada',
      becomesDefault: 'pasa a ser la predeterminada',
      voiceName: 'Nombre',
      whenToUse: 'Cuándo usarla',
      audienceName: 'Nombre',
      who: 'Quiénes son',
      removeSample: 'Quitar esta muestra',
      samplesFrom: {
        site_one: '{{count}} muestra, palabra por palabra del sitio',
        site_other:
          '{{count}} muestras, cada una palabra por palabra del sitio',
        files_one: '{{count}} muestra, palabra por palabra de los archivos',
        files_other:
          '{{count}} muestras, cada una palabra por palabra de los archivos',
        answers_one: '{{count}} muestra, de tus respuestas',
        answers_other: '{{count}} muestras, de tus respuestas',
      },
      thinVoice_one:
        'Una muestra. Solo había un pasaje con esta voz: uno es un ejemplo, tres son un patrón. Añade otra, o déjala así y añade más tarde.',
      thinVoice_other:
        '{{count}} muestras. Solo había {{count}} pasajes con esta voz: uno es un ejemplo, tres son un patrón. Añade otra, o déjala así y añade más tarde.',
      line: 'Línea',
      disclaimerDiffers:
        'El del sitio es distinto del tuyo. Conserva el tuyo salvo que elijas el otro.',
      compare: 'COMPARAR',
      keepYours: 'Conservar el tuyo',
      useTheirs: 'Usar el del sitio',
      writtenHereOn: 'Escrito aquí · {{date}}',
      disclaimerRule: 'No se sustituye nada salvo que elijas el del sitio.',
      positioning: {
        title: 'Lo que te distingue',
        statement: 'Declaración',
        differentiators: 'Lo que la respalda',
        differs:
          'Ogen ha leído una declaración distinta de la tuya. Conserva la tuya salvo que elijas la otra.',
        useRead: 'Usar la que ha leído Ogen',
        rule: 'No se sustituye nada salvo que elijas la que ha leído Ogen.',
      },
      factColumns: {
        statement: 'Afirmación',
        about: 'Sobre',
        kind: 'Tipo',
        expires: 'Caduca',
      },
      noExpiry: 'No caduca',
      moreFacts_one: 'Mostrar {{count}} dato más',
      moreFacts_other: 'Mostrar {{count}} datos más',
      openPage: 'Abrir la página',
      openFile: 'Abrir el archivo',
      kept: '{{kept}} de {{count}} conservados',
      keptShort: '{{kept}}/{{count}}',
      discard: 'Descartar',
      save: 'Guardar en Fundamentos',
    },
    saved: {
      title: 'Guardado en tus Fundamentos',
      nothing: 'nada nuevo',
      fromWebsite: '{{what}}, leído de {{site}}.',
      fromDocument: '{{what}}, sacado de {{title}}.',
      fromAnswers: '{{what}}, de tus respuestas.',
      duplicateFacts_one:
        '{{count}} dato ya estaba en tu registro, así que se dejó como estaba.',
      duplicateFacts_other:
        '{{count}} datos ya estaban en tu registro, así que se dejaron como estaban.',
      duplicateItems_one:
        '{{count}} elemento ya estaba en tus Fundamentos, así que se dejó como estaba.',
      duplicateItems_other:
        '{{count}} elementos ya estaban en tus Fundamentos, así que se dejaron como estaban.',
      overLimit_one:
        '{{count}} elemento no cabía en los límites de tus Fundamentos y no se guardó.',
      overLimit_other:
        '{{count}} elementos no cabían en los límites de tus Fundamentos y no se guardaron.',
    },
    failed: {
      title: 'Esta lectura no terminó',
      nothingTitle: {
        website: 'No hay suficiente en el sitio para seguir',
        document: 'No hay suficiente en los archivos para seguir',
        questions: 'No hay suficiente en las respuestas para seguir',
      },
      nothingBody: {
        website_one:
          'Ogen leyó {{count}} página pero apenas encontró texto: suele ser un sitio que construye sus páginas en el navegador, y lo que llega son menús y un aviso de cookies. No se propuso nada y esta lectura no cuenta en tu asignación.',
        website_other:
          'Ogen leyó {{count}} páginas pero apenas encontró texto en ellas: suele ser un sitio que construye sus páginas en el navegador, y lo que llega son menús y un aviso de cookies. No se propuso nada y esta lectura no cuenta en tu asignación.',
        document_one:
          'Ogen apenas encontró texto en el archivo: un escaneo, o una imagen sin palabras. No se propuso nada y esta lectura no cuenta en tu asignación.',
        document_other:
          'Ogen apenas encontró texto en los {{count}} archivos: escaneos, o imágenes sin palabras. No se propuso nada y esta lectura no cuenta en tu asignación.',
        questions_one:
          'Había demasiado poco en las respuestas para redactar. No se propuso nada y esta lectura no cuenta en tu asignación.',
        questions_other:
          'Había demasiado poco en las respuestas para redactar. No se propuso nada y esta lectura no cuenta en tu asignación.',
      },
      source: {
        thin: 'demasiado poco texto',
        failed: 'no se pudo leer',
        overLimit: 'por encima de tu límite de páginas',
        timedOut: 'tardó demasiado',
        read: 'leída',
      },
      tryInstead: 'Prueba en su lugar',
      instead: {
        website: 'Un sitio suele decir más que un solo archivo.',
        document:
          'Un dosier o una guía de estilo se leen mejor que un sitio así.',
        questions: 'Siete preguntas; sáltate las que quieras.',
      },
      reason: {
        scraping:
          'Aquí no está configurada la lectura de sitios web, así que no se pudo leer el sitio. No se propuso nada y esta lectura no cuenta en tu asignación.',
        refused:
          'El modelo se negó a leer esto. No se propuso nada y esta lectura no cuenta en tu asignación.',
        plan: 'Tu plan detuvo esta lectura antes de que terminara. No se propuso nada y no cuenta en tu asignación.',
        internal:
          'Algo falló por nuestra parte. No se propuso nada y esta lectura no cuenta en tu asignación.',
      },
      tryAgain: 'Volver a intentarlo',
    },
    closed: {
      back: 'Volver a Fundamentos',
      committed: {
        title: 'Guardado en tus Fundamentos',
        body: 'Lo que se conservó de esta lectura ya está en tus Fundamentos, y cada elemento dice de dónde se leyó.',
        bodyOn:
          'Lo que se conservó de esta lectura se guardó el {{date}} y ya está en tus Fundamentos, y cada elemento dice de dónde se leyó.',
      },
      discarded: {
        title: 'Esta lectura se descartó',
        body: 'No se guardó nada de ella. Empieza otra desde Fundamentos cuando quieras.',
      },
      expired: {
        title: 'Esta lectura ha caducado',
        body: 'Una propuesta espera treinta días a ser revisada, y esta no lo fue. No se guardó nada; empieza otra desde Fundamentos.',
      },
    },
  },

  overview: {
    nothingReads: 'Todavía nada lee esto',
    unreadable: 'No se ha podido cargar lo que hay aquí.',
    stated: '{{count}} indicados',
    none: 'ninguno',
    logosWithJobs: '{{count}} con función',
    coloursWithRoles: '{{count}} con rol',
    bannedWordCount: '{{count}} palabras',
    written: 'escrito',
    guardrails: {
      mayClaim: 'Se puede afirmar',
      mayClaimEmpty:
        'Nada tiene una formulación que sepamos que es seguro repetir.',
      neverClaim: 'No se puede afirmar nunca',
      neverClaimEmpty:
        'Nada está prohibido. Cualquier voz de aquí puede prometer lo que sea, con las palabras que sea.',
      bannedWords: 'Palabras prohibidas',
      disclaimer: 'Aviso legal',
    },
    templates: {
      isDefault:
        'Se aplica por defecto siempre que ninguna otra reclame la plataforma.',
      forPlatforms: 'Para {{platforms}}.',
      unreachable:
        'Ninguna plataforma la reclama y no es la predeterminada: nunca le llega nada.',
      ratios: '{{covered}} de {{total}} proporciones',
    },
  },

  detail: {
    back: 'Volver a Fundamentos',
    backToVoices: 'Volver a las voces',
    backToAudiences: 'Volver a las audiencias',
    errorHeader: 'No se pudo cargar Marca',
    errorMessage:
      'Las voces, audiencias y límites del espacio de trabajo no están accesibles en este momento. El resto de la aplicación no se ve afectado.',
    guardrailsErrorHeader: 'No se pudieron cargar los límites',
    guardrailsErrorMessage:
      'Las reglas del espacio de trabajo no están accesibles en este momento, y editarlas sin verlas sobrescribiría lo que hay. El resto de la aplicación no se ve afectado.',
    noVoiceHeader: 'No existe esa voz',
    noAudienceHeader: 'No existe esa audiencia',
    missingMessage:
      'Puede que se haya eliminado, o que el enlace sea de otro espacio de trabajo.',
    deleted: 'Se eliminó {{name}}.',
    guardrailsDeleted: 'Se eliminaron los límites.',
    about: 'Acerca de',
    usedBy: {
      title: 'Lo usan',
      empty: 'Aún no hay campañas.',
      noVoice: 'Sin voz',
      noAudience: 'Sin audiencia',
      defaultVoice: '{{voice}} (predeterminada)',
    },
  },

  look: {
    edit: 'Editar',
    gap: 'Sin logotipo, sin colores, sin tipografía. Todo lo que se genere con una imagen parecerá de banco de imágenes.',
    uploadLogo: 'Subir un logotipo',
    best: 'lo mejor',
    logoSlot: 'Logotipo',
    paletteSlot: 'Paleta',
    typeSlot: 'Tipografía',
    referenceSlot: 'Imágenes de referencia',
    noLogo:
      'Sin logotipo. Las plantillas y las imágenes de perfil no tienen nada que colocar.',
    noPalette: 'No se han indicado colores.',
    noTypefaces: 'No se han indicado tipografías.',
    noReference:
      'Nada con lo que guiar las imágenes generadas: acabarán donde los valores por defecto del modelo las dejen.',
    job: {
      profile: 'Foto de perfil',
      watermark: 'Marca de agua',
      mark: 'Solo el símbolo',
    },
  },

  voices: {
    writeFromScratch: 'Escribir una desde cero',
    writeFromScratchHint:
      'Empieza con una página en blanco y define tú sus reglas.',
    add: 'Añadir voz',
    addHint:
      'Otra más, para las publicaciones a las que ninguna de las anteriores les va bien.',
    starterGroupTitle: 'Empieza con una plantilla',
    starterGroupBody:
      'Tuya en cuanto la eliges: es una copia, no un enlace, así que si cambiamos la nuestra la tuya no cambia. Los ejemplos que añadas después son lo que hace que deje de sonar a plantilla.',
    starters: {
      plain: {
        title: 'Clara y directa',
        body: 'Frases cortas, sin jerga, sin emojis. Dice lo que tiene que decir y para.',
        name: 'Clara y directa',
        whenToUse: 'Cualquier cosa que deba entenderse a la primera',
        opening: 'Dice a qué viene en la primera frase.',
        closing: 'Para. Sin despedida y sin pregunta.',
      },
      warm: {
        title: 'Cercana y conversacional',
        body: 'Una persona hablando con otra. Contracciones, algún inciso, tuteo.',
        name: 'Cercana y conversacional',
        whenToUse: 'Las publicaciones que deben sonar a persona y no a empresa',
        opening: 'Abre con algo que pasó de verdad.',
        closing: 'Acaba con una pregunta que merezca respuesta.',
      },
      sharp: {
        title: 'Incisiva y con opinión',
        body: 'Toma partido en la primera línea y lo defiende. Seca, algo socarrona, nunca neutral.',
        name: 'Incisiva y con opinión',
        whenToUse:
          'Comentario, y cualquier cosa sobre la que el sector ya esté discutiendo',
        opening: 'Abre con la afirmación y luego se la gana.',
        closing: 'Acaba con la línea más afilada, no con un resumen.',
      },
    },
    noSamples:
      'Sin ejemplos. Esta voz tiene un nombre y nada detrás: generará exactamente lo mismo que no tener voz alguna.',
    thin: 'a partir de {{count}} empieza a funcionar',
    postsBehind: '{{count}} se podrían rehacer',
    defaultBacked:
      'La voz predeterminada: las publicaciones empiezan con ella salvo que se elija otra.',
    defaultThin:
      'La voz predeterminada, y sin nada que se le acerque detrás: las publicaciones empiezan con ella y no cambia casi nada de lo que dicen.',
    rules: {
      formality: {
        casual: 'informal',
        neutral: 'neutra',
        formal: 'formal',
      },
      person: {
        i: 'primera persona',
        we: 'nosotros',
        third: 'tercera persona',
        none: 'sin narrador',
      },
      emoji: {
        never: 'sin emojis',
        sparingly: 'algunos emojis',
        freely: 'emojis sin límite',
      },
      length: {
        short: 'publicaciones cortas',
        medium: 'publicaciones medias',
        long: 'publicaciones largas',
      },
    },

    editor: {
      needsName: 'Necesita un nombre para poder guardarse.',
      create: 'Crear voz',
      introNamed: 'Voz {{name}}',
      introNew: 'Una voz nueva',
      introBody:
        'Lo que hace una voz son de tres a ocho publicaciones reales que te habría gustado escribir. Todo lo demás de esta pantalla es lo que un ejemplo no puede decir por sí solo.',
      forkedNote:
        'Todavía no se ha guardado nada y los ejemplos están vacíos: esa es la mitad que una plantilla no puede darte, y la que hace el trabajo.',
      general: 'General',
      name: 'Nombre',
      namePlaceholder: 'Fundador, sin filtro',
      description: 'Descripción',
      descriptionHint:
        'Cuándo usarla: una línea, y la que un selector muestra debajo del nombre.',
      descriptionPlaceholder:
        'La publicación distendida de fin de semana, y nada más',
      samples: 'Ejemplos',
      readsAs: 'Se lee como',
      summaryPending: 'Se extrae de los ejemplos en cuanto se guarde.',
      samplesShort:
        'De tres a ocho publicaciones reales que te habría gustado escribir. Esto es la voz; todo lo de abajo es solo lo que un ejemplo no puede decir por sí solo.',
      addSample: 'Añadir un ejemplo',
      editSample: 'Editar ejemplo',
      samplePlaceholder: 'Pega una publicación que te habría gustado escribir.',
      removeSample: 'QUITAR EJEMPLO',
      cancel: 'CANCELAR',
      addIt: 'AÑADIRLO',
      done: 'LISTO',
      resetSamples: 'Restablecer ejemplos',
      rules: 'Reglas',
      rulesHint:
        'Lo que un ejemplo no puede decir por sí solo. Una publicación pegada enseña el registro; no puede prometer que las treinta siguientes se abstengan de los signos de exclamación.',
      opening: 'Cómo abre una publicación',
      openingHint:
        'La costumbre más reconocible de una voz, y merece la pena escribirla en vez de elegirla.',
      openingPlaceholder: 'Abre con la afirmación y luego se la gana.',
      closing: 'Cómo cierra una publicación',
      closingHint:
        'La mitad que la gente nota cuando falla: una pregunta, una llamada a la acción o nada en absoluto.',
      closingPlaceholder: 'Acaba con la línea más afilada, no con un resumen.',
      channels: 'Personalización por canal',
      channelsHint:
        'Una nota dentro de esta voz, no una segunda voz. «Más contenida en LinkedIn» va aquí; una segunda entrada casi idéntica en la biblioteca, no.',
      channelsUnbuilt:
        'Todavía sin construir. Todos los canales usan esta voz tal como está escrita arriba, hashtags incluidos: su sitio es este y no las reglas, y de momento no los fija nada.',
      choices: {
        formalityLabel: 'Formalidad',
        formality: {
          casual: 'informal',
          neutral: 'neutra',
          formal: 'formal',
        },
        personLabel: 'Habla como',
        person: {
          i: 'yo',
          we: 'nosotros',
          third: 'la empresa',
          none: 'sin narrador',
        },
        emojiLabel: 'Emojis',
        emoji: {
          never: 'nunca',
          sparingly: 'con moderación',
          freely: 'sin límite',
        },
        lengthLabel: 'Extensión',
        length: {
          short: 'corta',
          medium: 'media',
          long: 'larga',
        },
      },
      noun: 'voz',
      deleteCostPublished_one:
        'Se escribió {{count}} publicación publicada con esta voz. Al eliminarla, esa publicación se queda tal cual está —su texto se escribió y sigue en pie—, pero no se podrá generar nada nuevo con ella, y cualquier campaña que apunte aquí se quedará sin voz.',
      deleteCostPublished_other:
        'Se escribieron {{count}} publicaciones publicadas con esta voz. Al eliminarla, esas publicaciones se quedan tal cual están —su texto se escribió y sigue en pie—, pero no se podrá generar nada nuevo con ella, y cualquier campaña que apunte aquí se quedará sin voz.',
      deleteCostDrafts_one:
        '{{count}} borrador apunta a esta voz y se quedará sin voz.',
      deleteCostDrafts_other:
        '{{count}} borradores apuntan a esta voz y se quedarán sin voz.',
      deleteCostNone:
        'No se ha escrito nada con esta voz, así que no cambia nada más.',
    },
  },

  audiences: {
    describeYourself: 'Describir una tú mismo',
    describeYourselfHint: 'Di quiénes son con tus propias palabras.',
    add: 'Añadir audiencia',
    addHint:
      'Otra más, para las publicaciones a las que no van dirigidas las demás.',
    starterGroupTitle: 'Empieza con una plantilla',
    starterGroupBody:
      'Tres que tiene cualquier negocio, así que ninguna hay que inventarla. Elige una y rellena lo que se deriva de ella.',
    starters: {
      customers: {
        title: 'Quienes ya te compran',
        body: 'Descritos como son de verdad, no como los describe la presentación. La más fácil de acertar y la que más se salta.',
        name: 'Quienes ya nos compran',
      },
      nearly: {
        title: 'Quienes estuvieron a punto de comprar',
        body: 'Conocen la categoría, te miraron y eligieron a otro. Lo que necesitaban y no obtuvieron es todo el encargo.',
        name: 'Quienes estuvieron a punto de comprar',
      },
      advisers: {
        title: 'Quienes te recomiendan',
        body: 'No compran nunca nada. Pasan tu nombre, y necesitan algo citable que pasar con él.',
        name: 'Quienes nos recomiendan',
      },
    },
    readsOn: 'Lee en',
    scrollsPast: 'Pasa de largo si',
    believesWhen: 'Te cree cuando',
    notSaid: '— sin indicar',

    editor: {
      needsName: 'Necesita un nombre para poder guardarse.',
      create: 'Crear audiencia',
      introNamed: 'Audiencia {{name}}',
      introNew: 'Una audiencia nueva',
      introBody:
        'Una relación, descrita con la concreción suficiente como para poder equivocarse. Las tres líneas de más abajo son lo que la hace utilizable: dónde leen, qué les pierde y qué necesitan antes de creerse una cifra.',
      forkedNote:
        'Todavía no se ha guardado nada, y las tres líneas de abajo están en blanco: una plantilla sabe a qué relación te refieres y absolutamente nada sobre las personas que hay en ella.',
      general: 'General',
      name: 'Nombre',
      namePlaceholder: 'Jefes de equipo sin tiempo',
      who: 'Quiénes son',
      whoHint:
        'Concreto y que acote. Una edad, una costumbre y una sospecha, no «profesionales».',
      whoPlaceholder:
        'Jefes de equipo, 30-45 años, ya usan dos herramientas que resuelven esto a medias, desconfían de cualquier cosa que suene a venta, leen en el móvil entre reuniones.',
      consequences: 'Qué se deriva',
      readsAs: 'Se lee como',
      summaryPending: 'Se extrae de estas tres en cuanto se guarde.',
      consequencesHint:
        'Las tres cosas que cambian lo que se escribe. Una audiencia que no sabe responderlas es una etiqueta, y una etiqueta no mueve nada.',
      blank:
        'Todavía nada. Guardada así, la audiencia es una etiqueta y ni una sola publicación saldrá distinta por que exista.',
      readsOnLabel: 'Lee en',
      readsOnHint:
        'Dónde, en qué y a qué hora. Solo esta línea ya descarta la mitad de lo que publicarías.',
      readsOnPlaceholder: 'Móvil, después de las 20:00, con una mano',
      scrollsPastLabel: 'Pasa de largo cuando',
      scrollsPastHint:
        'La frase que les pierde, y merece la pena escribirla tal como la verían.',
      scrollsPastPlaceholder:
        'La primera línea lleva un porcentaje o la palabra «solución»',
      believesLabel: 'Te cree cuando',
      believesHint:
        'Qué tiene que acompañar a una afirmación para que la acepten.',
      believesPlaceholder: 'La cifra viene con el periodo en el que se midió',
      noun: 'audiencia',
      deleteCostPublished_one:
        'Se escribió {{count}} publicación publicada para esta audiencia. Al eliminarla, esa publicación se queda tal cual está —su texto se escribió y sigue en pie—, pero no se podrá escribir nada nuevo para ella, y cualquier campaña que apunte aquí se quedará sin audiencia.',
      deleteCostPublished_other:
        'Se escribieron {{count}} publicaciones publicadas para esta audiencia. Al eliminarla, esas publicaciones se quedan tal cual están —su texto se escribió y sigue en pie—, pero no se podrá escribir nada nuevo para ella, y cualquier campaña que apunte aquí se quedará sin audiencia.',
      deleteCostDrafts_one:
        '{{count}} borrador apunta a esta audiencia y se quedará sin audiencia.',
      deleteCostDrafts_other:
        '{{count}} borradores apuntan a esta audiencia y se quedarán sin audiencia.',
      deleteCostNone:
        'No se ha escrito nada para esta audiencia, así que no cambia nada más.',
    },
  },

  templates: {
    add: 'Añadir plantilla',
    gap: 'Las imágenes salen desnudas. Nada marca una imagen como tuya una vez que ha salido de la aplicación.',
    gapScreen:
      'Las imágenes salen desnudas. Nada marca una imagen como tuya una vez que ha salido de la aplicación, y aquí todavía no hay nada por plataforma, así que no hay marco de story de Instagram ni cierre de LinkedIn.',
    buildFromLogo: 'Crear una a partir de tu logotipo',
    uploadPng: 'Subir un PNG',
    appliedByDefault: 'Se aplica por defecto',
    overImage: 'Va encima de la imagen',
    underImage: 'Va debajo de la imagen',
    missingRatios:
      'Nada que aplicar en {{ratios}}: un PNG por proporción es lo que compra la simplicidad.',

    everywhere: 'En todas partes',
    everywhereDetail: 'Cuando ninguna otra la reclama',
    everywhereSubtitle:
      'Lo que se aplica en cualquier plataforma a la que no se le haya dado una propia.',
    noDefault:
      'No hay plantilla predeterminada. Todas las plataformas sin una propia envían las imágenes desnudas.',
    connectedGroup: 'Conectadas',
    notConnectedGroup: 'Todavía sin conectar',
    notConnected: 'sin conectar',
    connected: 'conectada',
    inherited:
      'Recurre a la predeterminada: todavía no hay nada específico de esta plataforma.',
    ownTemplate: 'Tiene una plantilla propia.',
    giveItsOwn: 'DARLE UNA PROPIA',
    replace: 'SUSTITUIR',
    nothingApplies:
      'Aquí no se aplica nada, y no hay ninguna predeterminada a la que recurrir.',
    drawnOver: 'se dibuja sobre la imagen',
    sitsUnder: 'va debajo de la imagen',
    isDefaultSuffix: ' · la predeterminada',
    neededEverything: 'todas las proporciones que produce la aplicación',
    neededPlatform_one: 'la proporción en la que publica {{platform}}',
    neededPlatform_other:
      'las {{count}} proporciones en las que publica {{platform}}',
    coversAll: 'Cubre {{needed}}.',
    coversNone:
      'No cubre ninguna de {{needed}}. Todas las imágenes de aquí salen desnudas.',
    coversSome_one:
      'Falta {{ratios}}: esa proporción sale desnuda frente a {{needed}}.',
    coversSome_other:
      'Faltan {{ratios}}: esas proporciones salen desnudas frente a {{needed}}.',
    openInCompositor: 'ABRIR EN EL COMPOSITOR',
  },

  guardrails: {
    cleared:
      'Se ha borrado todo. Unos límites que no indican nada son lo mismo que no tener ninguno: elimínalos abajo en su lugar.',
    forkedNote:
      'Han llegado las reglas y no los datos: una plantilla sabe qué no puede afirmar nunca un negocio como el tuyo, y absolutamente nada sobre qué es cierto en el tuyo. Se guarda tal cual, así que lee cada línea: esta es la sección que la gente deja de revisar.',
    starterGroupTitle: 'Empieza con una plantilla',
    starterGroupBody:
      'Tres formas que adoptan las reglas, en lugar de treinta sectores. Elige la más parecida y rellenará las listas de abajo: cada línea está pensada para leerse y editarse, porque esta es la sección en la que la gente va a confiar.',
    mayClaim: 'Se puede afirmar',
    mayClaimHint:
      'Afirmaciones ya revisadas, con la formulación con la que se revisaron. Esto es lo que evita que una frase que le costó una hora a un abogado se reescriba desde cero cada vez.',
    mayClaimPlaceholder:
      'Que la puesta en marcha lleva dos semanas, de principio a fin.',
    addClaim: 'AÑADIR UNA AFIRMACIÓN',
    neverClaim: 'No se puede afirmar nunca',
    neverClaimHint:
      'Escribe la afirmación en sí y no el tema: «cualquier resultado garantizado, en cualquier forma» y no «resultados». Un tema es algo que evitar mencionar; una afirmación es algo con lo que se puede contrastar una frase.',
    neverClaimEmpty:
      'Todavía no hay nada prohibido. Cualquier voz del espacio de trabajo puede prometer lo que sea, con las palabras que sea.',
    neverClaimPlaceholder:
      'Que el resultado está garantizado, en cualquier forma.',
    addRule: 'AÑADIR UNA REGLA',
    bannedWords: 'Palabras prohibidas',
    bannedWordsHint:
      'Palabras que no pueden aparecer nunca, en ninguna voz. Escribe una y pulsa Intro; las comas y las listas pegadas se separan en palabras sueltas.',
    bannedWordPlaceholder: 'garantizado',
    removeWord: 'Quitar {{word}}',
    disclaimer: 'Aviso legal',
    disclaimerHint:
      'Lo lleva cada publicación, se añade exactamente como está escrito y no se reformula nunca: una línea legal obligatoria, un número de registro, una declaración de publicidad.',
    disclaimerPlaceholder:
      'Los resultados varían. Nada de lo aquí expuesto es una promesa del resultado que obtendrás.',
    removeLine: 'Quitar esta línea',
    keyboardHint:
      'Intro empieza la siguiente. Pega una lista para añadirla entera de una vez.',
    noun: 'límites',
    dangerName: 'Límites',
    deleteCost:
      'La sección vuelve a quedarse vacía: ningún dato indicado, nada autorizado y nada prohibido, para todas las voces del espacio de trabajo. Las publicaciones ya publicadas no se tocan: su texto se escribió y sigue en pie.',
    starters: {
      regulated: {
        title: 'Regulado, y el riesgo son los resultados',
        body: 'Finanzas, salud, derecho. No se puede prometer ni insinuar ningún resultado, cada cifra indica su fuente y nada se describe como asesoramiento.',
        neverClaim: [
          'Cualquier rentabilidad o resultado futuro, en cualquier forma, incluido «históricamente» e incluido en broma.',
          'Que algo de lo que publicamos sea asesoramiento. Es información, y la diferencia es regulatoria.',
          'Que un resultado sea habitual, esté protegido, garantizado o sea seguro.',
          'Una cifra sin el periodo en el que se midió y sin indicar de dónde sale.',
        ],
        bannedWords: [
          'garantizado',
          'sin riesgo',
          'seguro',
          'demostrado',
          'ingresos pasivos',
        ],
      },
      product: {
        title: 'Un producto, y el riesgo son las funcionalidades',
        body: 'Software, hardware, comercio. Solo lo que ya está disponible: la hoja de ruta no es una funcionalidad y ninguna integración existe hasta que está en producción.',
        neverClaim: [
          'Una funcionalidad que no esté en la versión que la gente puede usar hoy. La hoja de ruta no es una funcionalidad.',
          'Una integración, plataforma o formato que no admitamos ya en producción.',
          'Una cifra de velocidad, disponibilidad o escala de la que no podamos señalar la fuente.',
          'Que a un competidor le falte algo, salvo que sea comprobable hoy y esté fechado.',
        ],
        bannedWords: [
          'sin fricciones',
          'sin esfuerzo',
          'ilimitado',
          'al instante',
          'revolucionario',
        ],
      },
      plain: {
        title: 'Todos los demás, y el riesgo es exagerar',
        body: 'Sin superlativos, sin estadísticas inventadas, sin nombrar a ningún cliente sin permiso y sin tomar prestada la autoridad de un logotipo.',
        neverClaim: [
          'Que somos los mejores, los primeros, los únicos o los que más crecen en lo que sea.',
          'Una estadística cuya fuente no podamos enseñar.',
          'Un cliente por su nombre, o sus resultados, sin permiso por escrito.',
          'Un respaldo que nadie ha dado, incluido insinuarlo con un logotipo.',
        ],
        bannedWords: [
          'líder del sector',
          'de talla mundial',
          'revolucionario',
          'insuperable',
          'no hay que pensárselo',
        ],
      },
    },
  },

  editor: {
    cancel: 'Cancelar',
    leave: {
      title: '¿Salir sin crearlo?',
      body: 'Aún no se ha guardado nada de esta pantalla. Si sales ahora, se pierde.',
      stay: 'Seguir editando',
      discard: 'DESCARTAR',
    },
    forkedFrom:
      'Partió de <name>{{name}}</name>, y se copió en lugar de enlazarse: si cambiamos la nuestra, la tuya no cambia.',
    danger: {
      title: 'Zona de peligro',
      delete: 'Eliminar {{noun}}',
      keep: 'Conservar {{noun}}',
      confirmTitle: '¿Eliminar «{{name}}»?',
      confirmBody: '{{cost}} Esto no se puede deshacer.',
    },
    default: 'Predeterminada',
    makeDefault: 'Hacer predeterminada',
  },
}

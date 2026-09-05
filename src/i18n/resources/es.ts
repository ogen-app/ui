import type { Translation } from './en'

/**
 * Spanish. Lazy-loaded — this file is never in the main chunk.
 *
 * The `Translation` annotation is what keeps it honest: it is a **type-only**
 * import, so it adds no runtime dependency on the English bundle, but a key
 * added to `en.ts` and forgotten here is a compile error rather than a string
 * that silently falls back mid-screen.
 *
 * Destructive-action labels keep their literal capitals, as in English.
 */
export const es: Translation = {
  common: {
    cancel: 'Cancelar',
    close: 'Cerrar',
    done: 'Listo',
    save: 'Guardar',
    tryAgain: 'Reintentar',
    trying: 'Intentando…',
    loading: 'Cargando…',
    somethingWentWrong: 'Algo ha salido mal.',
    opensInNewTab: 'Se abre en una pestaña nueva',
  },

  locale: {
    section: {
      title: 'Idioma',
      label: 'Idioma de la interfaz',
      description:
        'Se aplica solo a este navegador — no se comparte con el resto de tu espacio de trabajo. El inglés viene incluido; los demás idiomas se descargan la primera vez que los eliges.',
    },
  },

  validation: {
    firstName: {
      required: 'El nombre es obligatorio',
      tooLong: 'El nombre no puede superar los 50 caracteres',
      whitespace: 'El nombre no puede ser solo espacios en blanco',
    },
    lastName: {
      required: 'Los apellidos son obligatorios',
      tooLong: 'Los apellidos no pueden superar los 50 caracteres',
      whitespace: 'Los apellidos no pueden ser solo espacios en blanco',
    },
    organizationName: {
      required: 'El nombre de la organización es obligatorio',
      tooLong:
        'El nombre de la organización no puede superar los 100 caracteres',
      whitespace:
        'El nombre de la organización no puede ser solo espacios en blanco',
    },
    email: {
      required: 'El correo electrónico es obligatorio',
      invalid: 'El formato del correo electrónico no es válido',
    },
    password: {
      required: 'La contraseña es obligatoria',
      tooShort: 'La contraseña debe tener al menos 8 caracteres',
      needsUppercase: 'Debe contener una letra mayúscula',
      needsLowercase: 'Debe contener una letra minúscula',
      needsDigit: 'Debe contener un dígito',
    },
    confirmPassword: {
      required: 'Confirma tu contraseña',
      mismatch: 'Las contraseñas no coinciden',
    },
    passwordRules: {
      minChars: 'Mín. 8 caracteres',
      uppercase: 'una mayúscula',
      lowercase: 'una minúscula',
      digit: 'un dígito',
      separator: ', ',
      // Spanish does not take a comma before the final conjunction.
      lastSeparator: ' y ',
    },
  },

  auth: {
    login: {
      title: 'Iniciar sesión',
      subtitle: 'Inicia sesión para seguir gestionando tu contenido',
      submit: 'INICIAR SESIÓN',
      expired:
        'Tu sesión ha caducado — inicia sesión de nuevo para continuar donde lo dejaste',
      afterReset: 'Tu contraseña se ha cambiado. Inicia sesión con la nueva',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'Introduce tu correo electrónico',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Introduce la contraseña',
      forgot:
        '¿Has olvidado tu contraseña? <resetLink>Restablécela aquí</resetLink>.',
      noAccount: '¿Aún no tienes cuenta?',
      signUpLink: 'Regístrate',
    },
    register: {
      title: 'Crea tu organización',
      subtitle: 'Regístrate para empezar a gestionar tu contenido',
      submit: 'CREAR CUENTA',
      organizationLabel: 'Nombre de la organización',
      organizationPlaceholder: 'Introduce el nombre de tu organización',
      firstNameLabel: 'Nombre',
      firstNamePlaceholder: 'Introduce tu nombre',
      lastNameLabel: 'Apellidos',
      lastNamePlaceholder: 'Introduce tus apellidos',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'Introduce tu correo electrónico',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Introduce la contraseña',
      haveAccount: '¿Ya tienes cuenta?',
      logInLink: 'Inicia sesión aquí',
    },
    forgot: {
      title: 'Restablece tu contraseña',
      subtitle: 'Te enviaremos un enlace por correo para elegir una nueva',
      submit: 'ENVIAR ENLACE',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'Introduce tu correo electrónico',
      remembered: '¿Ya te acuerdas?',
      logInLink: 'Inicia sesión',
      sentTitle: 'Revisa tu bandeja de entrada',
      sentBody:
        'Si <strong>{{email}}</strong> tiene una cuenta de Ogen, va camino un enlace para elegir una contraseña nueva. Caduca en una hora.',
      resend: 'ENVIAR DE NUEVO',
      resentNote: 'Enviado de nuevo — dale un minuto.',
      emailHint:
        'Usa la dirección con la que inicias sesión. El enlace deja de funcionar después de una hora.',
      backToLogin: 'Volver al inicio de sesión',
    },
    reset: {
      title: 'Elige una contraseña nueva',
      subtitle: 'Elige una que no hayas usado aquí antes',
      submit: 'GUARDAR CONTRASEÑA',
      passwordLabel: 'Nueva contraseña',
      passwordPlaceholder: 'Introduce una contraseña nueva',
      confirmLabel: 'Confirma la nueva contraseña',
      confirmPlaceholder: 'Introdúcela otra vez',
      confirmHint:
        'Escríbela otra vez — un error aquí te deja fuera de tu propia cuenta.',
      requestNewLink: 'Pedir un enlace nuevo',
      knowPassword: '¿Recuerdas tu contraseña?',
      logInLink: 'Inicia sesión',
      brokenTitle: 'Este enlace no funciona',
      brokenSubtitle:
        'Parece incompleto — algunos clientes de correo cortan los enlaces largos por la mitad',
      brokenBody:
        'Abre el enlace directamente desde el correo o <request>pide uno nuevo</request>.',
    },
    invite: {
      title: 'Únete al espacio',
      subtitle: '{{inviter}} te ha invitado a {{workspace}}',
      emailLabel: 'Tu correo electrónico',
      firstNameLabel: 'Nombre',
      lastNameLabel: 'Apellidos',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Elige una contraseña',
      submit: 'UNIRME AL ESPACIO',
      haveAccount: '¿Ya tienes una cuenta de Ogen?',
      logInLink: 'Inicia sesión',
      brokenTitle: 'Este enlace de invitación ya no funciona',
      brokenSubtitle:
        'Las invitaciones caducan a los siete días y solo pueden usarse una vez',
      brokenBody:
        'Pide a quien te invitó que te envíe otra. Si ya la aceptaste, <login>inicia sesión</login>.',
      previewFailedTitle: 'No se ha podido comprobar la invitación',
      previewFailedSubtitle:
        'Algo ha fallado por nuestra parte — puede que el enlace siga siendo válido',
      joinBody:
        'Has iniciado sesión como {{email}}, que es a quien va dirigida esta invitación. Al aceptarla, este espacio se añade a tu cuenta.',
      joinSubmit: 'ACEPTAR INVITACIÓN',
      wrongAccountBody:
        'Esta invitación es para {{invited}}, pero has iniciado sesión como {{current}}. Cierra sesión y vuelve a abrir el enlace para aceptarla.',
      logOutLink: 'Cerrar sesión',
      existingAccountBody:
        '{{email}} ya tiene una cuenta de Ogen. Inicia sesión con esa cuenta y la invitación te estará esperando.',
    },
    logout: {
      pendingTitle: 'Cerrando sesión...',
      pendingMessage: 'Esto puede tardar unos segundos',
      doneTitle: 'Has cerrado sesión',
      doneMessage: '¡Hasta la próxima!',
      home: 'IR AL INICIO',
      footer: 'CIERRE DE SESIÓN',
    },
  },

  nav: {
    modules: 'Módulos',
    activity: 'Actividad',
    tasks: 'Tareas',
    activityUnread_one: '{{count}} entrada sin leer',
    activityUnread_other: '{{count}} entradas sin leer',
    campaigns: 'Campañas',
    contentBank: 'Banco de contenido',
    analytics: 'Analíticas',
    brand: 'Marca',
    workspaceSettings: 'Ajustes del espacio',
    profile: 'Perfil',
    help: 'Ayuda y soporte',
    logOut: 'Cerrar sesión',
    closeSidebar: 'Cerrar la barra lateral',
    switchWorkspace: 'Crear o cambiar',
    untitledCampaign: 'Campaña sin título',
    campaign: {
      overview: 'Resumen',
      posts: 'Calendario de publicaciones',
      analytics: 'Analíticas',
      brief: 'Briefing',
      content: 'Contenido',
      settings: 'Ajustes',
    },
  },

  tasks: {
    title: 'Tareas',
    add: 'AÑADIR TAREA',
    newTask: 'Nueva tarea',
    create: 'CREAR TAREA',
    cancel: 'Cancelar',
    complete: 'Marcar esta tarea como hecha',
    reopen: 'Reabrir esta tarea',
    delete: 'ELIMINAR TAREA',
    unassigned: 'Sin asignar',
    assignedTo: 'Asignada a {{name}}: cambiar',
    assign: 'Asignar esta tarea',
    createdBySystem: 'Creada automáticamente el {{at}}',
    createdBy: 'Escrita por {{name}} el {{at}}',
    closedBy: 'Marcada por {{name}} el {{at}}',
    autoResolved: 'Se resolvió sola: el aviso que la originó ya no existe',
    noDescription: 'Sin descripción',
    saveFailed: 'No se pudo guardar el cambio en tus tareas.',
    loadFailed: 'No se pudieron cargar las tareas',
    empty: {
      title: 'Nada que hacer',
      subtitle:
        'Aquí aparecerán las tareas que escribas y todo aquello que las campañas necesiten que se haga.',
    },
    rule: {
      failedPosts:
        'El publicador lo intentó y el canal lo rechazó. Abre las publicaciones, mira qué respondió (una cuenta desconectada, una imagen rechazada, un texto que el canal no admite), corrígelo y vuelve a publicar.',
      manualPublishDue:
        'Estas están configuradas para publicarse a mano y les ha llegado la hora. No saldrá nada hasta que alguien abra cada publicación y la publique.',
      autoPublishOverdue:
        'La hora ya pasó y el publicador no las ha enviado. Comprueba que el canal sigue conectado antes de reprogramarlas.',
      notPublished:
        'La ventana se cerró con estas todavía en espera, así que nunca se enviaron. Decide en cada caso si aún merece la pena publicarla o si se descarta.',
      plannedTodayUnscheduled:
        'Hay publicaciones con fecha para el próximo día que siguen siendo borradores. Una fecha es un plan, no una orden: mientras no estén programadas, nadie las enviará.',
      pipelineGap:
        'No hay nada programado para la próxima semana. Escribe y programa publicaciones ahora o la campaña se quedará en silencio.',
      accountsMissingBlocking:
        'Un canal en el que publica esta campaña no tiene ninguna cuenta conectada, así que sus publicaciones no pueden salir. Conecta la cuenta o quita el canal de la campaña.',
      accountInactive:
        'Una cuenta conectada ha dejado de autorizar, normalmente por un token caducado. Vuelve a conectarla en los ajustes del espacio de trabajo antes de su próxima hora.',
      channelDroppedScheduled:
        'Se quitó un canal de la campaña mientras aún había publicaciones programadas para él. Esas publicaciones no tienen dónde publicarse.',
      behindPace:
        'Han salido menos publicaciones de las que implica el objetivo de la campaña para el tiempo transcurrido. Programa más o ajusta el objetivo a lo que la campaña está haciendo de verdad.',
    },
    field: {
      title: 'Qué hay que hacer',
      titlePlaceholder: 'Escribe la tarea como la dirías',
      description: 'Descripción',
      descriptionPlaceholder:
        'En qué consiste el trabajo y lo que la siguiente persona deba saber',
      campaign: 'Campaña',
      noCampaign: 'Sin campaña',
      assignee: 'Asignada a',
    },
    openCount_one: '{{count}} tarea abierta',
    openCount_other: '{{count}} tareas abiertas',
  },

  activity: {
    title: 'Actividad',
    markAllRead: 'MARCAR TODO COMO LEÍDO',
    loadFailed: 'No se pudo cargar la actividad',
    notificationsUnavailable:
      'No se pudieron cargar las notificaciones; solo se muestran los informes diarios.',
    summariesUnavailable:
      'No se pudieron cargar los resúmenes de campaña; algunas entradas pueden no tener enlace y los informes diarios no están disponibles.',
    truncated:
      'Mostrando las 100 entradas más recientes. Los informes diarios de abajo llegan más atrás.',
    empty: {
      title: 'Todavía no ha pasado nada',
      subtitle:
        'Aquí aparecerán las publicaciones que salgan, las que fallen y un informe de cada día.',
    },
    unread: 'Sin leer',
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
      assetReady: 'Un documento terminó de procesarse',
      assetIngestFailed: 'No se pudo procesar un documento',
      campaignContentPlanReady_one:
        'Hay un plan de contenido listo — {{count}} publicación',
      campaignContentPlanReady_other:
        'Hay un plan de contenido listo — {{count}} publicaciones',
    },
    report: {
      label: {
        published: 'Publicadas',
        failed: 'Fallidas',
        notPublished: 'Nunca publicadas',
        created: 'Creadas',
      },
      published_one: '{{count}} publicación publicada',
      published_other: '{{count}} publicaciones publicadas',
      failed_one: '{{count}} publicación no se pudo publicar',
      failed_other: '{{count}} publicaciones no se pudieron publicar',
      notPublished_one: '{{count}} publicación nunca se publicó',
      notPublished_other: '{{count}} publicaciones nunca se publicaron',
      created_one: '{{count}} publicación creada',
      created_other: '{{count}} publicaciones creadas',
      byChannel: 'Publicado por canal',
      byCampaign: 'Por campaña',
      nothing: 'Ese día no pasó nada.',
      coverage:
        'Calculado a partir de las publicaciones de este espacio, según tu día natural local.',
    },
  },

  campaignOverview: {
    openOverview: 'ABRIR RESUMEN',
    openPosts: 'ABRIR CALENDARIO',
    openAnalytics: 'ABRIR ANALÍTICAS',
    openBrief: 'ABRIR BRIEFING',
    openContent: 'ABRIR CONTENIDO',
    openSettings: 'ABRIR AJUSTES',
    noDate: 'Sin fecha',
  },

  calendar: {
    unscheduled: 'SIN PROGRAMAR',
    unscheduledPosts: 'Publicaciones sin programar',
    settings: 'Ajustes del calendario',
    viewWeek: 'Semana',
    viewMonth: 'Mes',
    viewList: 'Lista',

    previousWeek: 'Semana anterior',
    nextWeek: 'Semana siguiente',
    previousMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    preferences: 'PREFERENCIAS',
    daysVisibility: 'VISIBILIDAD DE LOS DÍAS',
    firstDayOfWeek: 'Primer día de la semana',
    statusColourAlways:
      'El color de estado del borde izquierdo de la tarjeta siempre se muestra.',
    notAPublishingDay: 'No es un día de publicación',
    showDay: 'Mostrar {{day}}',

    field: {
      status: 'Etiqueta de estado',
      time: 'Hora',
      title: 'Título',
      platform: 'Plataforma',
      account: 'Cuenta',
    },
    fieldNoteStatus: 'Escribe el estado y da a la hora su propia línea',
    showFieldOnWeek: 'Mostrar {{field}} en la tarjeta de semana',
    showFieldOnMonth: 'Mostrar {{field}} en la tarjeta de mes',

    imagePreviews: 'Mostrar las tarjetas con vista previa de la imagen',
    imagePreviewsNote:
      'Solo las publicaciones que tienen imagen y, en el mes, solo en los días con espacio para una',
    weekCard: 'TARJETA DE SEMANA',
    monthCard: 'TARJETA DE MES',
    addPostOn: 'Añadir una publicación el {{date}}',
    density_one: '{{count}} publicación el {{date}} — abrir esta semana',
    density_other: '{{count}} publicaciones el {{date}} — abrir esta semana',

    notScheduled: 'Publicaciones sin programar',
    addPost: 'AÑADIR PUBLICACIÓN',
    dateLocked: 'La fecha de esta publicación está bloqueada',

    empty: {
      calendarTitle: 'Tu calendario está vacío',
      calendarSubtitle:
        'Añade tu primera publicación y aparecerá aquí, lista para programar.',
      listTitle: 'Aún no hay publicaciones',
      listSubtitle:
        'Añade tu primera publicación para empezar a construir esta campaña.',
      panelTitle: 'Nada sin programar',
      panelSubtitle:
        'Las publicaciones sin fecha esperan aquí — arrastra una fuera del calendario o añade una nueva.',
    },
  },

  assistant: {
    activeThreads_one: '{{count}} conversación activa',
    activeThreads_other: '{{count}} conversaciones activas',
    pendingThreads_one: '{{count}} pendiente',
    pendingThreads_other: '{{count}} pendientes',

    untitledCampaign: 'Campaña sin título',
    untitledPost: 'Publicación sin título',

    finished: 'El estratega ha terminado',
    failed: 'El estratega no ha podido terminar',
  },

  workspace: {
    role: {
      owner: 'Propietario',
      member: 'Miembro',
    },
    ability: {
      owner:
        'Puede invitar personas, cambiar roles, conectar cuentas y renombrar el espacio.',
      member:
        'Puede planificar, escribir y publicar contenido, pero no gestionar el espacio ni a su gente.',
    },
  },

  workspaces: {
    title: 'Tus espacios',
    loadFailed: 'No se han podido cargar tus espacios.',
    create: 'NUEVO ESPACIO',
    current: 'Actual',
    memberCount_one: '{{count}} miembro',
    memberCount_other: '{{count}} miembros',
    loggedInAs: 'Sesión iniciada como',
    wrongAccount: '¿Cuenta equivocada?',
    logOut: 'Cerrar sesión',
    switchFailed: 'No se ha podido cambiar de espacio',
    createDialog: {
      title: 'Nuevo espacio',
      body: 'Un espacio tiene sus propias campañas, contenido y cuentas conectadas — incluidas sus propias cuentas sociales, así que un segundo espacio es la forma de llevar otra página de LinkedIn o Facebook junto a esta.',
      nameLabel: 'Nombre',
      namePlaceholder: 'Cliente Northwind',
      cancel: 'Cancelar',
      createOnly: 'Solo crear',
      createAndSwitch: 'Crear y cambiar',
      created: '{{name}} creado',
      createdNote: 'Cambia a él desde el menú de espacios cuando lo necesites.',
      createFailed: 'No se ha podido crear el espacio',
    },
  },

  profile: {
    title: 'Perfil',
    account: {
      title: 'Cuenta',
      description:
        'Datos personales. Los ajustes del espacio de trabajo, incluido quién más tiene acceso, están en Ajustes del espacio.',
      firstName: 'Nombre',
      lastName: 'Apellidos',
      email: 'Correo electrónico',
      emailWarning:
        'Esta es la dirección con la que inicias sesión. Cambia en cuanto guardes, y no se envía ninguna confirmación para comprobar que funciona — una errata aquí te deja fuera en el próximo inicio de sesión.',
    },
    password: {
      title: 'Contraseña',
      body: 'Tu contraseña se cambia por correo. Te enviaremos un enlace a <email>{{email}}</email> — es la única vía que además cierra la sesión en tus otros dispositivos, que suele ser justo lo que se busca.',
      sentBody:
        'Un enlace para establecer una nueva contraseña va de camino a <email>{{email}}</email>. Caduca en una hora, y usarlo cierra la sesión en todos los dispositivos — incluido este.',
      send: 'ENVIARME UN ENLACE DE RESTABLECIMIENTO',
      resend: 'ENVIARLO DE NUEVO',
      resentNote: 'Enviado de nuevo — dale un minuto.',
    },
    dangerZone: {
      title: 'Zona de peligro',
      body: 'Salir de este espacio te quita el acceso y elimina todo lo que creaste en él — para todos. Tu cuenta de acceso y tus otros espacios no se tocan. Esto no se puede deshacer.',
      action: 'SALIR DE ESTE ESPACIO',
    },
    leave: {
      title: '¿Salir de {{workspace}}?',
      body: 'Esto elimina a <strong>{{email}}</strong> del espacio y borra todo lo que creaste en él — tus campañas, sus publicaciones, los recursos que subiste y las etiquetas — para todos los miembros. Las publicaciones ya enviadas siguen activas en las redes sociales. No se puede deshacer.',
      shared:
        'Tu cuenta de acceso sigue funcionando: cualquier otro espacio al que pertenezcas no se toca, y <strong>{{workspace}}</strong> continúa sin ti. Si eres su único propietario, nombra antes a otro propietario — un espacio no puede quedarse sin propietario.',
      thisWorkspace: 'este espacio',
      confirmLabel: 'Escribe <email>{{email}}</email> para confirmar',
      keep: 'QUEDARME EN ESTE ESPACIO',
      confirm: 'SALIR DE ESTE ESPACIO',
    },
  },

  workspaceSettings: {
    title: 'Ajustes del espacio',
    loadFailed: 'No se han podido cargar los ajustes',
    workspace: {
      rowTitle: 'Espacio de {{name}}',
      loadFailed: 'No se ha podido cargar el espacio de trabajo.',
      nameLabel: 'Nombre del espacio',
      nameEmpty: 'El nombre no puede estar vacío',
      slugLabel: 'Identificador',
      slugNote:
        'Se genera a partir del nombre al crearlo; cambiar el nombre del espacio no lo modifica.',
      switch: 'CAMBIAR',
      timeZoneLabel: 'Zona horaria',
      timeZoneNote:
        'Por ahora todo se programa en UTC; las zonas horarias por espacio llegan con CON-94.',
    },
    people: {
      title: 'Personas',
      membersHeading: 'Miembros del espacio',
      pendingHeading: 'Invitaciones pendientes',
      inviteHeading: 'Invitar a alguien',
      you: '(eres tú)',
      memberNote:
        'Solo el propietario del espacio puede invitar personas o cambiar roles.',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'nombre@empresa.com',
      roleLabel: 'Rol',
      invite: 'INVITAR',
      remove: 'ELIMINAR',
      resend: 'REENVIAR',
      cancel: 'CANCELAR',
      cancelInvitation: 'Cancelar la invitación a {{email}}',
      // Agrees with the (elided) "invitación", never with the person — the
      // invitee's gender is unknown.
      invitedBy: 'invitación de {{name}}',
      expiresToday: 'caduca hoy',
      expiresIn_one: 'caduca mañana',
      expiresIn_other: 'caduca en {{count}} días',
      expiredToday: 'caducó hoy',
      expiredAgo_one: 'caducó ayer',
      expiredAgo_other: 'caducó hace {{count}} días',
      roleChanged: 'Rol actualizado para {{name}}',
      roleChangeFailed: 'No se ha podido cambiar el rol',
      // Impersonal construction on purpose: no participle agreeing with a
      // person whose gender we don't know.
      removed: 'Se ha eliminado a {{name}}',
      removeFailed: 'No se ha podido eliminar',
      invitationSent: 'Invitación enviada a {{email}}',
      inviteFailed: 'No se ha podido enviar la invitación',
      resendFailed: 'No se ha podido volver a enviar',
      invitationRevoked: 'Invitación revocada',
      revokeFailed: 'No se ha podido revocar',
      removeTitle: '¿Eliminar a {{name}}?',
      removeBody:
        'Esto elimina a {{name}} del espacio y borra todo lo que creó en él — sus campañas, las publicaciones de esas campañas y los archivos que subió — para todo el mundo. Su cuenta de acceso y sus otros espacios no se tocan. Las publicaciones ya enviadas siguen activas en las redes sociales. No se puede deshacer.',
      removeConfirmLabel: 'Escribe su correo electrónico para confirmar',
      // No clitic pronoun: "MANTENERLA/LO" would gender the member being kept.
      removeDismiss: 'NO ELIMINAR',
      removeConfirm: 'ELIMINAR DE ESTE ESPACIO',
    },
    dangerZone: {
      title: 'Zona de peligro',
      body: 'Eliminar este espacio elimina sus campañas, publicaciones, recursos y cuentas sociales conectadas, y todos los miembros pierden el acceso. Las publicaciones ya enviadas siguen activas en las redes sociales. No puedes deshacerlo tú mismo — recuperar un espacio eliminado es una solicitud manual a soporte.',
      lastWorkspace:
        'Este es tu único espacio. Eliminarlo te deja sin ningún sitio donde trabajar — crea otro primero.',
      action: 'ELIMINAR ESPACIO',
      confirmTitle: '¿Eliminar {{name}}?',
      confirmBody:
        'Todo lo que hay en este espacio se elimina, para todos los miembros, y no puedes restaurarlo tú mismo. Escribe <strong>{{name}}</strong> para confirmar.',
      confirmLabel: 'Nombre del espacio',
      keep: 'MANTENER ESPACIO',
      confirm: 'ELIMINAR ESPACIO',
      onlyWorkspace: 'Este es tu único espacio',
      onlyWorkspaceNote: 'Crea otro espacio antes de eliminar este.',
      deleteFailed: 'No se ha podido eliminar el espacio',
    },
    platforms: {
      title: 'Ajustes de plataformas',
      empty:
        'Aún no hay plataformas conectadas — elige una en «Conectar plataformas», más abajo.',
      contentTypes: 'Tipos de contenido disponibles',
      contentTypesEmpty: 'Ninguno',
      accountInactive:
        'Inactiva en {{platform}} — no puede recibir publicaciones',
      reconnect: 'Reconectar',
      disconnectAccount: 'Desconectar {{name}}',
      disconnectTooltip: 'Desconectar esta cuenta',
      status: {
        connected: 'Conectada',
        degradedMessage:
          'Conectada, pero la sincronización con {{publisher}} está degradada — lo reintentamos automáticamente.',
        disabledMessage:
          'Conectada, pero la integración de publicación está desactivada en el servidor.',
      },
    },
    autoPublish: {
      allowedTitle: 'Publicación automática permitida',
      allowedBody:
        'Las publicaciones programadas salen solas, en todas las campañas.',
      blockedTitle: 'Publicación automática no permitida',
      blockedBody:
        'Las publicaciones programadas esperan a que las publiques a mano.',
      allow: 'PERMITIR',
      disallow: 'NO PERMITIR',
      checkFailed:
        'No se han podido consultar las publicaciones programadas de {{platform}}',
      pending: {
        title_one: '{{platform}} tiene {{count}} publicación en cola',
        title_other: '{{platform}} tiene {{count}} publicaciones en cola',
        body_one:
          'Desactivar la publicación automática solo cambia cómo se programan las publicaciones a partir de ahora. Esta publicación ya está en cola con el proveedor y saldrá igualmente si no se convierte.',
        body_other:
          'Desactivar la publicación automática solo cambia cómo se programan las publicaciones a partir de ahora. Estas publicaciones ya están en cola con el proveedor y saldrán igualmente si no se convierten.',
        untitledPost: 'Publicación sin título',
        noDate: 'sin fecha',
        progress:
          'Convirtiendo {{done}} de {{total}} — cada publicación hay que sacarla antes de la cola del proveedor. Deja esto abierto hasta que termine.',
        keep: 'Mantener la publicación automática',
        convert_one: 'Pasarla a manual',
        convert_other: 'Pasar las {{count}} a manual',
        converted_one: '{{count}} publicación pasada a publicación manual',
        converted_other: '{{count}} publicaciones pasadas a publicación manual',
        convertFailed_one:
          'No se ha podido convertir {{failed}} de {{count}} publicación',
        convertFailed_other:
          'No se han podido convertir {{failed}} de {{count}} publicaciones',
        convertFailedDetail:
          'Siguen programadas para publicarse solas. La publicación automática se ha dejado activada.',
      },
    },
    connect: {
      title: 'Conectar plataformas',
      integrationOff:
        'La integración de publicación no está configurada en este servidor, así que por ahora no se puede conectar.',
      noPlatforms: 'No hay plataformas disponibles para conectar.',
      connect: 'Conectar',
      connectedCount_one: '{{count}} conectada',
      connectedCount_other: '{{count}} conectadas',
      modalTitle: 'Conectar {{platform}}',
      preparing: 'Preparando tu enlace de conexión…',
      redirecting: 'Te llevamos a {{platform}}…',
      success:
        '{{platform}} está conectada. La encontrarás en Ajustes de plataformas.',
      settling:
        'Terminando la configuración — la cuenta aparecerá aquí en un momento.',
      errors: {
        expired:
          'Ese enlace de conexión ha caducado. Vuelve a empezar la conexión.',
        mismatch: 'Algo ha fallado al conectar tu cuenta. Inténtalo de nuevo.',
        upstream:
          'No hemos podido contactar con la plataforma. Inténtalo dentro de un momento.',
        noTargets:
          'Esta cuenta no tiene páginas ni perfiles en los que podamos publicar.',
        generic: 'No hemos podido conectar tu cuenta. Inténtalo de nuevo.',
      },
      picker: {
        title: 'Elige qué conectar',
        body: 'Tu cuenta de {{platform}} gestiona más de un perfil. Elige en cuál debe publicar Ogen.',
        legend: 'Perfiles de {{platform}} disponibles',
        submit: 'CONECTAR {{platform}}',
        cancel: 'CANCELAR',
        back: 'Volver a Ajustes del espacio',
        backToAccounts: 'VOLVER A AJUSTES DEL ESPACIO',
        expired:
          'Esta conexión ha caducado o ya se ha usado. Vuelve a empezar desde Ajustes del espacio.',
        empty: 'No hay nada en esta cuenta en lo que podamos publicar.',
        invalidTarget:
          'Esa opción ya no está disponible. Recarga la página y vuelve a elegir.',
        kind: {
          organization: 'Página de empresa',
          page: 'Página',
          personal: 'Perfil personal',
        },
      },
    },
    disconnect: {
      title: '¿Desconectar {{name}}?',
      body: 'Ogen dejará de publicar en esta cuenta de {{platform}}, y la conexión también se elimina en el proveedor de publicación — así que no volverá en la siguiente sincronización.',
      published:
        'Las publicaciones ya publicadas siguen visibles en {{platform}}. Puedes volver a conectar la cuenta más adelante, pero tendrá que pasar otra vez por el flujo de autorización.',
      keep: 'MANTENER CONECTADA',
      confirm: 'DESCONECTAR CUENTA',
      succeeded: '{{name}} desconectada',
      blocked: {
        title: 'Esta cuenta tiene publicaciones programadas',
        body_one:
          '<strong>1 publicación programada se publica</strong> como {{name}}. Desconectar ahora la deja apuntando a una cuenta que ya no existe, así que fallará al publicarse.',
        body_other:
          '<strong>{{count}} publicaciones programadas se publican</strong> como {{name}}. Desconectar ahora las deja apuntando a una cuenta que ya no existe, así que fallarán al publicarse.',
        keep_one:
          'Para conservarla, cierra esto y desprográmala primero — después podrás elegirle otra cuenta.',
        keep_other:
          'Para conservarlas, cierra esto y desprograma esas publicaciones primero — después podrás elegir otra cuenta para cada una.',
        confirm: 'DESCONECTAR IGUALMENTE',
      },
    },
  },

  integration: {
    rateLimited: 'Demasiados intentos — vuelve a intentarlo en un momento.',
    rateLimitedIn:
      'Demasiados intentos — vuelve a intentarlo en {{seconds}} s.',
    disabled:
      'La integración de publicación no está configurada en este servidor.',
    degraded:
      'La integración de publicación no está disponible temporalmente. Inténtalo de nuevo en un momento.',
    alreadyDisconnected: 'Esta cuenta ya está desconectada.',
    removalUnconfirmed:
      'El proveedor de publicación no ha confirmado la eliminación, así que no se ha cambiado nada. Inténtalo de nuevo en un momento.',
  },

  postsTable: {
    sortSaveFailed: 'No se ha podido guardar el orden que has elegido',

    columnTitle: 'Título',
    columnStatus: 'Estado',
    columnPlatform: 'Plataforma',
    columnPublishDate: 'Fecha de publicación',
    columnWhen: 'Cuándo',

    notSet: 'Sin definir',

    noPosts: 'No hay publicaciones',

    selectAll: 'Seleccionar todas las publicaciones',
    clearSelection: 'Borrar la selección',
    selectPost: 'Seleccionar {{title}}',

    today: 'Hoy',
    tomorrow: 'Mañana',
    yesterday: 'Ayer',
    inDays_one: 'Dentro de {{count}} día',
    inDays_other: 'Dentro de {{count}} días',
    daysAgo_one: 'Hace {{count}} día',
    daysAgo_other: 'Hace {{count}} días',
  },

  analytics: {
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
      ahead: 'Mirando hacia delante — no le afecta el periodo de arriba',
      everyPlatform: 'Todas las plataformas — no le afecta el filtro de arriba',
      allTimeEveryPlatform:
        'Desde siempre y todas las plataformas — no le afectan los controles de arriba',
      aheadEveryPlatform:
        'Mirando hacia delante y todas las plataformas — no le afectan los controles de arriba',
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
      publicationsAria_other:
        '{{count}} publicaciones enviadas en este periodo',
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
      save_rate: {
        label: 'Guardados',
        rawLabel: 'Guardados',
        suffix: 'por cada 1.000 alcanzadas',
        heldOut_one:
          'Una publicación no reportó guardados, o la vio muy poca gente como para dividir.',
        heldOut_other:
          '{{count}} publicaciones no reportaron guardados, o las vio muy poca gente como para dividir.',
      },
      follow_rate: {
        label: 'Seguimientos',
        rawLabel: 'Seguimientos',
        suffix: 'por cada 1.000 alcanzadas',
        heldOut_one:
          'Una publicación no reportó seguimientos, o la vio muy poca gente como para dividir.',
        heldOut_other:
          '{{count}} publicaciones no reportaron seguimientos, o las vio muy poca gente como para dividir.',
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
      advisoryBasis:
        'La puntuación es orientativa y se hizo antes de publicar.',
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
      strongestSlot:
        'Tu mejor franja es <1>{{slot}}</1>, a partir de {{posts}}.',
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
      selectAll: 'SELECCIONAR TODAS',
      deselectAll: 'DESELECCIONAR TODAS',
      allPlatforms: 'TODAS LAS PLATAFORMAS',
      accounts_one: '{{count}} cuenta',
      accounts_other: '{{count}} cuentas',
      platformAccounts: '{{platform}} — {{accounts}}',
      platformNoAccount: '{{platform}} — ninguna cuenta conectada',
      platformAccountsLabel: '{{platform}}, {{accounts}}',
      platformNoAccountLabel: '{{platform}}, ninguna cuenta conectada',
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
      readingTotal: 'Total acumulado',
      readingHour: '1H',
      readingDay: '1D',
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
  },

  posts: {
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
        'Esto se publica como una cadena de publicaciones, cada una respondiendo a la anterior. Escribe --- en una línea aparte donde quieras un corte; si no hay ningún divisor, los cortes son las líneas en blanco. Lo que siga pasándose del límite de caracteres se recorta para que quepa.',

      splitByDivider_one:
        'Se publica como {{count}} publicación, cortada donde pusiste un divisor.',
      splitByDivider_other:
        'Se publica como {{count}} publicaciones, cortadas donde pusiste un divisor.',
      splitByBlankLine_one:
        'Se publica como {{count}} publicación, cortada en las líneas en blanco.',
      splitByBlankLine_other:
        'Se publica como {{count}} publicaciones, cortadas en las líneas en blanco.',
      splitAutoCut_one:
        '{{count}} de ellas salieron de texto cortado en {{limit}} caracteres.',
      splitAutoCut_other:
        '{{count}} de ellas salieron de texto cortado en {{limit}} caracteres.',
      splitByLimit_one:
        'Se publica como {{count}} publicación, recortada para caber en {{limit}} caracteres.',
      splitByLimit_other:
        'Se publica como {{count}} publicaciones, recortadas para caber en {{limit}} caracteres.',
      splitSingle: 'Se publica como una sola publicación.',
      splitPending: 'Calculando en cuántas publicaciones se divide esto…',
      splitOverflow:
        'Esto son más de {{max}} publicaciones. Acórtalo o publícalo como más de un hilo.',

      mediaPerPost: 'Todos los límites de aquí son por publicación del hilo.',
      mediaOn: 'Publicación {{position}}',
      mediaOnLabel:
        'Este archivo va en la publicación {{position}}: elige otra',

      saveFailed: 'No se pudo guardar qué publicación lleva cada archivo.',

      postCount_one: '{{count}} publicación',
      postCount_other: '{{count}} publicaciones',

      check: {
        label: 'Hilo',
        pending: 'Comprobando…',
        overflow: 'Más de {{max}} publicaciones',
        issues_one:
          'La publicación {{positions}} lleva más archivos de los que admite una publicación',
        issues_other:
          'Las publicaciones {{positions}} llevan más archivos de los que admite una publicación',
      },

      previewNote:
        'Un hilo: cada publicación de abajo sale por separado, respondiendo a la anterior.',
      previewNoteUnsplit:
        'La tarjeta divide esto en las líneas en blanco, pero se publica como una sola publicación: Ogen aún no envía el hilo.',
    },

    status: {
      draft: 'Borrador',
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

    backToPosts: 'Volver a las publicaciones',

    hasProblem: 'Esta publicación tiene un problema',

    sources: {
      heading: 'Fuentes',
      sectionTitle: 'FUENTES',
      add: 'AÑADIR FUENTE',
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
      unlinked: {
        title: 'Nada conecta esta publicación con lo que se publicó',
        body: 'Salió a mano, así que no podemos encontrarla en la plataforma ni tenemos cifras suyas. Añadir el enlace conecta las dos — a partir de ahí se mide como cualquier otra.',
        action: 'AÑADIR ENLACE',
      },
      waiting: {
        title: 'Las cifras están en camino',
        body: 'Esta publicación ya salió y aún no han vuelto las primeras cifras. Suelen llegar en unas horas; esto se rellenará solo.',
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
    },

    versions: {
      liveDraft: 'Borrador',
      liveDraftTime: 'Sin guardar',
      liveDraftNote: 'Todavía sin instantánea',
      liveSubmitted: 'Texto actual',
      liveSubmittedNote: 'Nunca se guardó una instantánea',
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
  },
  tiers: {
    notInPlan: 'No está en tu plan',
    notInPlanBody:
      'Esto no forma parte del plan de tu espacio de trabajo. Al mejorarlo, se activa para todo el equipo.',

    limitReached: 'Has alcanzado tu límite',
    resets: 'Tu cuota vuelve a estar completa el {{when}}.',

    usage: '{{used}} de {{limit}}',
    usageDay: '{{used}} de {{limit}} hoy',
    usageMonth: '{{used}} de {{limit}} este mes',
    usagePost: '{{used}} de {{limit}} en esta publicación',
    usagePublish: '{{used}} de {{limit}} para esta publicación',
    unlimited: 'Sin límite',

    upgrade: 'MEJORAR PLAN',

    suspended: 'Solo lectura',
    suspendedBody:
      'Tu plan ha cambiado, así que esto es de solo lectura por ahora. No se ha eliminado nada: sigue todo aquí, y al mejorar el plan vuelve a ser editable.',
    suspendedSince: 'De solo lectura desde el {{when}}.',

    plansTitle: 'Planes',
    planIntro:
      'Lo que puede hacer este espacio y lo que cambiarían los demás planes.',
    planMock:
      'Los planes todavía no están conectados a la facturación. Elegir uno solo cambia lo que este espacio puede hacer.',
    planLoadFailed: 'No se han podido cargar los planes.',
    plansClose: 'Cerrar los planes',
    changePlan: 'CAMBIAR',

    billingTitle: 'Plan y facturación',
    billingMock:
      'La facturación todavía no está conectada. Aquí no se cobra nada y no se guarda ningún dato de pago.',
    paymentMethod: 'Método de pago y datos de facturación',
    cardEnding: 'terminada en {{last4}}',
    cardWithProvider: 'Tu método de pago lo guarda Lemon Squeezy.',
    noSubscription: 'No se está cobrando nada por este espacio.',
    accessEnds: 'El acceso termina el {{when}}.',
    accessEnded: 'El acceso terminó el {{when}}.',
    ownersOnly:
      'Solo los propietarios del espacio pueden ver los datos de facturación.',

    providerHolds:
      'Tu método de pago, tu dirección de facturación, tu NIF/CIF, tus facturas y la cancelación los gestiona Lemon Squeezy, que vende Ogen como comerciante registrado.',
    managePortal: 'GESTIONAR',
    portalFailed: 'No se ha podido abrir el portal de facturación.',

    statusPastDue: 'Pago fallido',
    statusCancelled: 'Cancelado',
    statusPaused: 'En pausa',
    statusExpired: 'Caducado',
    statusUnpaid: 'Sin pagar',

    paymentRetrying:
      'El último pago ha fallado y Lemon Squeezy volverá a intentarlo.',
    paymentStopped:
      'El último pago ha fallado y no se volverá a intentar: actualiza tu método de pago en Lemon Squeezy para conservar este plan.',

    currentPlan: 'Plan actual',
    currentBadge: 'Actual',
    scheduledBadge: 'Programado',
    retired: 'Ya no se ofrece',
    since: 'En este plan desde el {{when}}.',

    onPlan: 'Estás en el plan {{name}}.',
    onPlanMonthly: 'Estás en el plan {{name}}, con facturación mensual.',
    onPlanYearly: 'Estás en el plan {{name}}, con facturación anual.',

    autoRenews: 'Se renueva automáticamente el {{when}}.',
    autoRenewsIn: 'Se renueva automáticamente {{relative}}, el {{when}}.',

    choose: 'ELEGIR',
    chooseNamed: 'Elegir {{name}}',
    cancelChange: 'CANCELAR EL CAMBIO',

    changeScheduled: 'Pasarás a {{name}} el {{when}}.',
    changeScheduledUp: '{{name}} empieza el {{when}}.',
    changeScheduledIn: 'Pasarás a {{name}} {{relative}}, el {{when}}.',
    changeScheduledUpIn: '{{name}} empieza {{relative}}, el {{when}}.',
    changeScheduledBody:
      'No se borrará nada. Si superas los límites del nuevo plan, algunas cosas pasarán a ser de solo lectura hasta que vuelvas a subir.',
    changeFailed: 'No se ha podido cambiar tu plan.',
    changedNow: 'Ya estás en {{name}}.',
    changeCancelled: 'Se ha anulado ese cambio.',

    limitFlat: '{{value}}',
    limitDay: '{{value}} al día',
    limitMonth: '{{value}} al mes',
    limitPost: '{{value}} por publicación',
    limitPublish: '{{value}} por publicación programada',
    included: 'Incluido',
    excluded: 'No incluido',

    price: '{{price}} al mes',
    priceYear: '{{price}} al año',
    priceFree: 'Gratis',

    features: {
      seats: 'Miembros del equipo',
      social_accounts: 'Cuentas conectadas',
      multiple_accounts_per_platform: 'Varias cuentas en una misma plataforma',
      campaigns: 'Campañas',
      custom_campaign_types: 'Tipos de campaña personalizados',
      content_plan_runs: 'Ejecuciones del plan de contenido',
      post_assistant: 'Asistente de publicaciones',
      post_quality_reviews: 'Revisiones de calidad',
      post_versions: 'Historial de versiones',
      brand_personas: 'Perfiles de marca',
      brand_voices: 'Voces de marca',
      media_storage_bytes: 'Almacenamiento multimedia',
    },
  },

  campaigns: {
    title: 'Campañas',
    add: 'AÑADIR CAMPAÑA',
    error: 'No se pudieron cargar las campañas',
    untitled: 'esta campaña',
    empty: {
      title: 'Todavía no hay campañas',
      subtitle: 'Crea tu primera campaña para empezar',
    },
    archivedTitle: 'Campañas archivadas',
    archivedError: 'No se pudieron cargar las campañas archivadas',
    showArchived: 'Ver las campañas archivadas',
    showActive: 'Volver a las campañas activas',
    archivedOn: 'Archivada el {{archivedOn}}',
    unarchive: 'DESARCHIVAR',
    archivedEmpty: {
      title: 'No hay nada archivado',
      subtitle:
        'Archivar una campaña la quita de la lista sin borrar nada. Sus publicaciones, su calendario y su contenido siguen tal cual.',
    },
    archiveCard: {
      title: 'Archivar',
      body: 'Quita esta campaña de la lista de campañas y deja de ofrecerla allí donde se archiva trabajo nuevo. No se borra nada, y puedes recuperarla cuando quieras.',
      action: 'ARCHIVAR CAMPAÑA',
      confirm: '¿Archivar {{name}}? Podrás recuperarla desde el archivo.',
    },
    dangerZone: {
      title: 'Zona de peligro',
      body: 'Eliminar una campaña borra sus publicaciones y su calendario. Esto no se puede deshacer: archívala si solo quieres quitarla de la lista.',
      action: 'ELIMINAR CAMPAÑA',
      confirm: '¿Eliminar {{name}}? Esto no se puede deshacer.',
    },
  },

  content: {
    unsupported: {
      title: 'Esto no es un documento',
      body: 'Esta versión de la aplicación no sabe mostrar este tipo de recurso. No se ha cambiado nada: sigue aquí, y una versión más reciente lo abrirá.',
    },

    image: {
      titlePlaceholder: 'Título',
      altLabel: 'Texto alternativo',
      altPlaceholder: 'Una persona en un taller sosteniendo un implante dental',
      altHelp:
        'Lo que se le dice de la imagen a quien no puede verla. Acompaña a la imagen cuando esta pasa a una publicación.',
      altCount_one: 'Queda {{count}} carácter',
      altCount_other: 'Quedan {{count}} caracteres',
      descriptionLabel: 'Descripción',
      descriptionPlaceholder:
        'Qué hay en esta imagen y para qué sirve: las palabras con las que debería encontrarse.',
      descriptionHelp:
        'No se muestra a nadie. Es lo que consulta el asistente cuando busca una imagen que usar.',
      tagsLabel: 'Etiquetas',
      tagsPlaceholder: 'Añade una etiqueta…',
      tagsHelp: 'Cómo vuelves a encontrar esta imagen en la lista.',
      missing: 'Esta imagen no se guardó, así que no hay nada que mostrar.',
      animated: 'Animada',
    },

    selection: {
      count_one: '{{count}} seleccionado',
      count_other: '{{count}} seleccionados',
      clear: 'QUITAR SELECCIÓN',
      delete: 'ELIMINAR',
    },

    tagging: {
      action: 'ETIQUETAR',
      title_one: 'Etiquetar este documento',
      title_other: 'Etiquetar {{count}} documentos',
      addLabel: 'Añadir etiquetas',
      addPlaceholder: 'Añade una etiqueta…',
      addHelp:
        'Todos los documentos seleccionados las reciben. Los que ya tienen una etiqueta se quedan como están.',
      removeLabel: 'Quitar etiquetas',
      removeHelp:
        'Haz clic en una etiqueta para quitarla de los documentos que la llevan.',
      removeNone: 'Nada de esta selección tiene etiquetas todavía.',
      onCount: 'en {{count}} de {{total}}',
      cancel: 'CANCELAR',
      submit: 'APLICAR',
      done_one: '{{count}} documento actualizado',
      done_other: '{{count}} documentos actualizados',
    },
  },

  uploads: {
    limitDocs: 'Markdown hasta {{md}}, PDF hasta {{pdf}}',
    limitImages: 'Imágenes (JPEG, PNG, WebP, GIF) hasta {{size}}',
    pdfNote: 'Los PDF se leen en segundo plano, así que terminan después.',
    browse: 'Suelta los archivos aquí o haz clic para elegirlos',
    remove: 'Quitar {{name}}',
    cancel: 'CANCELAR',
    submit: 'SUBIR',
    submitCount: 'SUBIR ({{n}})',
    dropInto: 'Añadir a {{scope}}',
  },

  errors: {
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
  },
}

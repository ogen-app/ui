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
      tooLong: 'El nombre de la organización no puede superar los 100 caracteres',
      whitespace: 'El nombre de la organización no puede ser solo espacios en blanco',
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
      expired: 'Tu sesión ha caducado — inicia sesión de nuevo para continuar donde lo dejaste',
      afterReset: 'Tu contraseña se ha cambiado. Inicia sesión con la nueva',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'Introduce tu correo electrónico',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Introduce la contraseña',
      forgot: '¿Has olvidado tu contraseña? <resetLink>Restablécela aquí</resetLink>.',
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
      emailHint: 'Usa la dirección con la que inicias sesión. El enlace deja de funcionar después de una hora.',
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
      confirmHint: 'Escríbela otra vez — un error aquí te deja fuera de tu propia cuenta.',
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
      descriptionPlaceholder: 'En qué consiste el trabajo y lo que la siguiente persona deba saber',
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
    markReadFailed: 'No se pudo guardar por dónde ibas en la actividad.',
    loadFailed: 'No se pudo cargar la actividad',
    empty: {
      title: 'Todavía no ha pasado nada',
      subtitle:
        'Aquí aparecerán las publicaciones que salgan, las que fallen y un informe de cada día.',
    },
    unread: 'Sin leer',
    today: 'Hoy',
    yesterday: 'Ayer',
    entry: {
      failed: 'No se pudo publicar una publicación de {{channel}}',
      notPublished: 'Una publicación de {{channel}} nunca se publicó',
      reportTitle: 'Informe diario',
      task_created: 'Tarea añadida — «{{title}}»',
      task_completed: 'Tarea hecha — «{{title}}»',
      task_resolved: 'Tarea resuelta sola — «{{title}}»',
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
    imagePreviewsNote: 'Solo las publicaciones que tienen imagen y, en el mes, solo en los días con espacio para una',
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
      listSubtitle: 'Añade tu primera publicación para empezar a construir esta campaña.',
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
      invitedBy: 'invitada por {{name}}',
      expiresToday: 'caduca hoy',
      expiresIn_one: 'caduca mañana',
      expiresIn_other: 'caduca en {{count}} días',
      expiredToday: 'caducó hoy',
      expiredAgo_one: 'caducó ayer',
      expiredAgo_other: 'caducó hace {{count}} días',
      roleChanged: 'Rol actualizado para {{name}}',
      roleChangeFailed: 'No se ha podido cambiar el rol',
      removed: '{{name}} eliminada',
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
      removeDismiss: 'MANTENERLA',
      removeConfirm: 'ELIMINAR DE ESTE ESPACIO',
    },
    dangerZone: {
      title: 'Zona de peligro',
      body: 'Eliminar este espacio elimina sus campañas, publicaciones, recursos y cuentas sociales conectadas, y todos los miembros pierden el acceso. Las publicaciones ya enviadas siguen activas en las redes sociales. No puedes deshacerlo tú mismo — recuperar un espacio eliminado es una solicitud manual a soporte.',
      lastWorkspace: 'Este es tu único espacio. Eliminarlo te deja sin ningún sitio donde trabajar — crea otro primero.',
      action: 'ELIMINAR ESPACIO',
      confirmTitle: '¿Eliminar {{name}}?',
      confirmBody: 'Todo lo que hay en este espacio se elimina, para todos los miembros, y no puedes restaurarlo tú mismo. Escribe <strong>{{name}}</strong> para confirmar.',
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
      cadence: 'Frecuencia',
      constraints: 'Restricciones',
      /** Cadence and constraints await real backend data — see PlatformRow. */
      comingSoon: 'Próximamente',
      contentTypes: 'Tipos de contenido disponibles',
      contentTypesEmpty: 'Ninguno',
      accountInactive: 'Inactiva en {{platform}} — no puede recibir publicaciones',
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
      allowedBody: 'Las publicaciones programadas salen solas, en todas las campañas.',
      blockedTitle: 'Publicación automática no permitida',
      blockedBody: 'Las publicaciones programadas esperan a que las publiques a mano.',
      allow: 'PERMITIR',
      disallow: 'NO PERMITIR',
      checkFailed: 'No se han podido consultar las publicaciones programadas de {{platform}}',
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
        convertFailed_one: 'No se ha podido convertir {{failed}} de {{count}} publicación',
        convertFailed_other: 'No se han podido convertir {{failed}} de {{count}} publicaciones',
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
      success: '{{platform}} está conectada. La encontrarás en Ajustes de plataformas.',
      settling: 'Terminando la configuración — la cuenta aparecerá aquí en un momento.',
      errors: {
        expired: 'Ese enlace de conexión ha caducado. Vuelve a empezar la conexión.',
        mismatch: 'Algo ha fallado al conectar tu cuenta. Inténtalo de nuevo.',
        upstream: 'No hemos podido contactar con la plataforma. Inténtalo dentro de un momento.',
        noTargets: 'Esta cuenta no tiene páginas ni perfiles en los que podamos publicar.',
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
    rateLimitedIn: 'Demasiados intentos — vuelve a intentarlo en {{seconds}} s.',
    disabled: 'La integración de publicación no está configurada en este servidor.',
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

  posts: {
    publishStatus: {
      auto: 'Publicación automática {{when}}',
      manual: 'Recordatorio {{when}}',
      compactNow: 'ahora',
      compactLate: '{{amount}} de retraso',
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

    hasProblem: 'Esta publicación tiene un problema',
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

    planTitle: 'Plan',
    plansTitle: 'Planes',
    planIntro: 'Lo que puede hacer este espacio y lo que cambiarían los demás planes.',
    planMock:
      'Los planes todavía no están conectados a la facturación. Elegir uno solo cambia lo que este espacio puede hacer.',
    planLoadFailed: 'No se han podido cargar los planes.',
    planBack: 'Volver a la configuración del espacio',
    plansClose: 'Cerrar los planes',
    changePlan: 'CAMBIAR DE PLAN',

    billingTitle: 'Plan y facturación',
    manage: 'GESTIONAR',
    billingMock:
      'La facturación todavía no está conectada. Aquí no se cobra nada y no se guarda ningún dato de pago.',
    billingSectionTitle: 'Facturación',
    paymentMethod: 'Método de pago',
    cardEnding: 'terminada en {{last4}}',
    noCard: 'No hay ningún método de pago guardado.',
    noSubscription: 'No se está cobrando nada por este espacio.',
    accessEnds: 'El acceso termina el {{when}}.',
    ownersOnly: 'Solo los propietarios del espacio pueden ver los datos de facturación.',

    handledByProvider: 'Datos de facturación',
    providerHolds:
      'Tu método de pago, tu dirección de facturación, tu NIF/CIF, tus facturas y la cancelación los gestiona Lemon Squeezy, que vende Ogen como comerciante registrado.',
    portalMissing: 'Todavía no hay nada que abrir: llegará con la facturación.',
    managePortal: 'GESTIONAR LA FACTURACIÓN',
    portalFailed: 'No se ha podido abrir el portal de facturación.',

    statusPastDue: 'Pago fallido',
    statusCancelled: 'Cancelado',
    statusPaused: 'En pausa',
    statusExpired: 'Caducado',
    statusUnpaid: 'Sin pagar',

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
      messageSecondLine: 'Puede que se esté reiniciando o que esté temporalmente sin servicio.',
      type: 'SIN CONEXIÓN',
    },
  },
}

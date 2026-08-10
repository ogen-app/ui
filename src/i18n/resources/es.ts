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
      forgotPrompt: '¿Has olvidado tu contraseña?',
      forgotAction: 'Restablécela aquí',
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
    campaigns: 'Campañas',
    contentBank: 'Banco de contenido',
    workspaceSettings: 'Ajustes del espacio',
    profile: 'Perfil',
    help: 'Ayuda y soporte',
    logOut: 'Cerrar sesión',
    closeSidebar: 'Cerrar la barra lateral',
    untitledCampaign: 'Campaña sin título',
    campaign: {
      overview: 'Resumen',
      posts: 'Publicaciones',
      analytics: 'Analíticas',
      brief: 'Briefing',
      assets: 'Recursos',
      settings: 'Ajustes',
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
      body: 'Eliminar tu cuenta también elimina las campañas, publicaciones y recursos que hayas creado en este espacio de trabajo. Esto no se puede deshacer.',
      action: 'ELIMINAR CUENTA',
    },
    delete: {
      title: '¿Eliminar tu cuenta?',
      body: 'Esto elimina permanentemente <strong>{{email}}</strong> y todo lo que hayas creado en este espacio de trabajo: tus campañas, sus publicaciones, los recursos que has subido y las etiquetas. No se puede deshacer.',
      shared:
        'Si alguien más usa <strong>{{workspace}}</strong>, ese contenido también desaparece para esa persona. El espacio de trabajo en sí no se elimina.',
      thisWorkspace: 'este espacio de trabajo',
      confirmLabel: 'Escribe <email>{{email}}</email> para confirmar',
      keep: 'CONSERVAR MI CUENTA',
      confirm: 'ELIMINAR MI CUENTA',
    },
  },

  workspaceSettings: {
    title: 'Ajustes del espacio',
    loadFailed: 'No se han podido cargar los ajustes',
    workspace: {
      rowTitle: 'Espacio de {{name}}',
      loadFailed: 'No se ha podido cargar el espacio de trabajo.',
      nameLabel: 'Nombre de la organización',
      nameEmpty: 'El nombre no puede estar vacío',
      slugLabel: 'Identificador',
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
      authorize:
        'Autoriza tu cuenta de {{platform}} en la pestaña que se acaba de abrir. Si no se ha abierto nada, usa el botón de abajo.',
      openConnectPage: 'Abrir la página de conexión de {{platform}}',
      expiry:
        'El enlace caduca a las {{time}}. Cuando termines, la cuenta aparecerá aquí automáticamente — puede tardar un minuto.',
      expirySoon: 'pronto',
      checkNow: 'Comprobar ahora',
      success: '{{platform}} está conectada. La encontrarás en Ajustes de plataformas.',
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

import type { Translation } from '../en'

export const auth: Translation['auth'] = {
  login: {
    title: 'Iniciar sesión',
    subtitle: 'Inicia sesión para seguir gestionando tu contenido',
    submit: 'Iniciar sesión',
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
    submit: 'Crear cuenta',
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
  testerInvite: {
    title: 'Únete a la beta de Ogen',
    subtitle:
      'El equipo de Ogen te ha invitado. Tu espacio de trabajo es gratuito.',
    emailLocked: 'Esta es la dirección a la que se envió tu invitación.',
    mismatch:
      'Esta invitación es para <strong>{{email}}</strong>. Regístrate con esa dirección o usa el formulario de abajo.',
    expiredTitle: 'Esta invitación ha caducado',
    expiredBody:
      'El enlace ya no es válido. Puede que haya caducado, que lo haya sustituido una invitación más reciente o que ya se haya usado. Pide al equipo de Ogen que te envíe una nueva.',
    logInInstead: 'Iniciar sesión',
    previewFailedTitle: 'No hemos podido comprobar esta invitación',
    previewFailedSubtitle:
      'Algo ha fallado por nuestra parte; puede que el enlace siga siendo válido',
    signedInTitle: 'Has iniciado sesión como {{name}}',
    signedInBody:
      'Esta invitación es para {{email}}. Cierra la sesión para aceptarla con esa dirección. Tus espacios de trabajo actuales se quedan tal como están.',
    signOutAndContinue: 'Cerrar sesión y continuar',
    staySignedIn: 'Seguir con esta sesión',
  },
  privateBeta: {
    title: 'Ogen está en beta privada',
    body: 'Estamos dando acceso por invitación mientras terminamos el producto. Si te han invitado, abre el enlace de tu correo de invitación para crear tu espacio de trabajo.',
    contact:
      '¿Aún no tienes invitación? Escribe a <mail>{{email}}</mail> y cuéntanos para qué usarías Ogen.',
  },
  google: {
    continue: 'Continuar con Google',
    orWithEmail: 'o con tu correo electrónico',
    orSignUpWithEmail: 'o regístrate con tu correo electrónico',
    errors: {
      google_cancelled:
        'Se canceló el inicio de sesión con Google. Inténtalo de nuevo cuando quieras.',
      google_state_invalid:
        'Ese inicio de sesión tardó demasiado o se abrió en otro navegador. Inténtalo de nuevo.',
      google_email_unverified:
        'Google aún no ha verificado esa dirección de correo, así que no podemos usarla para iniciar tu sesión.',
      google_unavailable:
        'No hemos podido conectar con Google. Inténtalo de nuevo en un momento.',
      google_link_requires_password:
        'Ya hay una cuenta de Ogen con este correo. Inicia sesión con tu contraseña y conecta Google desde tu Perfil.',
      google_already_connected:
        'Esta cuenta de Ogen está conectada a otra cuenta de Google. Usa esa, o inicia sesión con tu contraseña.',
      google_linked_elsewhere:
        'Esa cuenta de Google ya da acceso a otra cuenta de Ogen.',
      no_active_workspace:
        'Tu cuenta no pertenece ahora mismo a ningún espacio de trabajo. Pide a un propietario que te invite de nuevo.',
      signup_invite_only:
        'Por ahora el registro es solo con invitación. Usa el enlace de tu correo de invitación.',
      invite_invalid:
        'Este enlace de invitación ya no funciona. Pide a quien te invitó que te envíe otro.',
      invite_email_mismatch:
        'Esta invitación es para otro correo. Continúa con la cuenta de Google a la que se envió.',
      invite_seats_full:
        'Este espacio de trabajo no tiene plazas libres. Pide a un propietario que libere una y abre el enlace de nuevo.',
      throttled: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
      unknown: 'El inicio de sesión con Google no terminó. Inténtalo de nuevo.',
    },
  },
  googleSignup: {
    title: 'Ponle nombre a tu espacio de trabajo',
    subtitle: 'Un último paso — aquí vivirán tus campañas',
    organizationLabel: 'Nombre de la organización',
    organizationHint:
      'Puedes cambiarlo más tarde en Ajustes del espacio de trabajo.',
    submit: 'Crear espacio de trabajo',
    notYou: '¿No eres tú?',
    logInLink: 'Inicia sesión',
    expiredTitle: 'Este enlace de registro ha caducado',
    expiredSubtitle:
      'Los enlaces duran 15 minutos. Continúa con Google de nuevo — retomarás justo donde lo dejaste',
    expiredInline:
      'Este enlace de registro ha caducado. Continúa con Google de nuevo para retomar donde lo dejaste.',
    accountExists:
      'Ya hay una cuenta de Ogen con este correo. Continúa con Google para iniciar sesión en ella.',
    startOver: 'Continuar con Google',
    loadFailedTitle: 'No hemos podido cargar este registro',
    loadFailedSubtitle:
      'Algo ha fallado por nuestra parte — puede que el enlace siga siendo válido',
  },
  forgot: {
    title: 'Restablece tu contraseña',
    subtitle: 'Te enviaremos un enlace por correo para elegir una nueva',
    submit: 'Enviar enlace',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'Introduce tu correo electrónico',
    remembered: '¿Ya te acuerdas?',
    logInLink: 'Inicia sesión',
    sentTitle: 'Revisa tu bandeja de entrada',
    sentBody:
      'Si <strong>{{email}}</strong> tiene una cuenta de Ogen, va camino un enlace para elegir una contraseña nueva. Caduca en una hora.',
    resend: 'Enviar de nuevo',
    resentNote: 'Enviado de nuevo — dale un minuto.',
    emailHint:
      'Usa la dirección con la que inicias sesión. El enlace deja de funcionar después de una hora.',
    backToLogin: 'Volver al inicio de sesión',
  },
  reset: {
    title: 'Elige una contraseña nueva',
    subtitle: 'Elige una que no hayas usado aquí antes',
    submit: 'Guardar contraseña',
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
  secureAccount: {
    title: 'Protege tu cuenta de Ogen',
    intro:
      'Hemos detectado un nuevo inicio de sesión en <strong>{{email}}</strong>:',
    detailsLabel: 'Detalles del inicio de sesión',
    whenLabel: 'Cuándo',
    deviceLabel: 'Dispositivo',
    ipLabel: 'Dirección IP',
    locationLabel: 'Ubicación aproximada',
    methodLabel: 'Inicio de sesión con',
    methodGoogle: 'Google',
    googleNote:
      '<strong>Como este inicio de sesión fue con Google, también desconectaremos Google.</strong> Vuelve a conectarlo desde tu Perfil cuando recuperes el acceso.',
    explainer:
      'Si no has sido tú, protege tu cuenta. Cerraremos todas las sesiones en todos los dispositivos — incluida esta — y elegirás una contraseña nueva enseguida.',
    submit: 'Proteger mi cuenta',
    wasMe: 'He sido yo',
    failed:
      'No hemos podido conectar con Ogen, así que aún no ha cambiado nada. Inténtalo de nuevo.',
    rateLimited_one:
      'Demasiados intentos. Inténtalo de nuevo dentro de {{count}} minuto.',
    rateLimited_other:
      'Demasiados intentos. Inténtalo de nuevo dentro de {{count}} minutos.',
    loadFailedTitle: 'No hemos podido comprobar este enlace',
    loadFailedSubtitle:
      'Algo ha fallado por nuestra parte — puede que el enlace siga siendo válido',
    usedTitle: 'Este enlace ya se ha usado',
    usedBody: 'Tu cuenta se protegió y se cerraron todas las sesiones.',
    usedReset:
      '¿Aún tienes que elegir una contraseña nueva? <reset>Restablécela aquí</reset>.',
    expiredTitle: 'Este enlace ha caducado',
    expiredBody:
      'Los enlaces son válidos durante 24 horas. Restablecer la contraseña también cierra todas las sesiones.',
    expiredSubmit: 'Restablecer mi contraseña',
    invalidTitle: 'Este enlace no es válido',
    invalidBody: 'Comprueba que has abierto el enlace completo del correo.',
    invalidReset:
      '¿Te preocupa tu cuenta? <reset>Restablece tu contraseña</reset>.',
  },
  invite: {
    title: 'Únete al espacio',
    subtitle: '{{inviter}} te ha invitado a {{workspace}}',
    emailLabel: 'Tu correo electrónico',
    firstNameLabel: 'Nombre',
    lastNameLabel: 'Apellidos',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Elige una contraseña',
    submit: 'Unirme al espacio',
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
    joinSubmit: 'Aceptar invitación',
    wrongAccountBody:
      'Esta invitación es para {{invited}}, pero has iniciado sesión como {{current}}. Cierra sesión y vuelve a abrir el enlace para aceptarla.',
    logOutLink: 'Cerrar sesión',
    existingAccountBody:
      '{{email}} ya tiene una cuenta de Ogen. Inicia sesión con esa cuenta y la invitación te estará esperando.',
    googleHint: 'Usa la cuenta de Google de <strong>{{email}}</strong>.',
    orSetPassword: 'o elige una contraseña',
  },
  logout: {
    pendingTitle: 'Cerrando sesión...',
    pendingMessage: 'Esto puede tardar unos segundos',
    doneTitle: 'Has cerrado sesión',
    doneMessage: '¡Hasta la próxima!',
    home: 'Ir al inicio',
    footer: 'Cierre de sesión',
  },
}

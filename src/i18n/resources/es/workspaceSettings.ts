import type { Translation } from '../en'

export const workspaceSettings: Translation['workspaceSettings'] = {
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
    switch: 'Cambiar',
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
    invite: 'Invitar',
    remove: 'Eliminar',
    resend: 'Reenviar',
    cancel: 'Cancelar',
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
    removeDismiss: 'No eliminar',
    removeConfirm: 'Eliminar de este espacio',
  },
  dangerZone: {
    title: 'Zona de peligro',
    body: 'Eliminar este espacio elimina sus campañas, publicaciones, recursos y cuentas sociales conectadas, y todos los miembros pierden el acceso. Las publicaciones ya enviadas siguen activas en las redes sociales. No puedes deshacerlo tú mismo — recuperar un espacio eliminado es una solicitud manual a soporte.',
    lastWorkspace:
      'Este es tu único espacio. Eliminarlo te deja sin ningún sitio donde trabajar — crea otro primero.',
    action: 'Eliminar espacio',
    confirmTitle: '¿Eliminar {{name}}?',
    confirmBody:
      'Todo lo que hay en este espacio se elimina, para todos los miembros, y no puedes restaurarlo tú mismo. Escribe <strong>{{name}}</strong> para confirmar.',
    confirmLabel: 'Nombre del espacio',
    keep: 'Mantener espacio',
    confirm: 'Eliminar espacio',
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
    needsReconnect: 'Hay que reconectarla',
    reconnectDialog: {
      title: 'Reconectar {{platform}}',
      body: 'Iniciarás sesión en {{platform}} y volverás aquí. Tus publicaciones y ajustes no cambian, y las publicaciones programadas en esta cuenta saldrán en cuanto vuelva.',
      continue: 'Continuar en {{platform}}',
      cancel: 'Cancelar',
    },
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
    allow: 'Permitir',
    disallow: 'No permitir',
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
      permission:
        'No hemos podido conectar una página o perfil. Vuelve a conectar y asegúrate de permitir el acceso a una página o perfil que gestiones.',
      noTargets:
        'Esta cuenta no tiene páginas ni perfiles en los que podamos publicar.',
      generic: 'No hemos podido conectar tu cuenta. Inténtalo de nuevo.',
    },
    picker: {
      title: 'Elige qué conectar',
      body: 'Tu cuenta de {{platform}} gestiona más de un perfil. Elige en cuál debe publicar Ogen.',
      legend: 'Perfiles de {{platform}} disponibles',
      submit: 'Conectar {{platform}}',
      cancel: 'Cancelar',
      nothingTitle: 'Nada que conectar',
      back: 'Volver a Ajustes del espacio',
      backToAccounts: 'Volver a Ajustes del espacio',
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
    keep: 'Mantener conectada',
    confirm: 'Desconectar cuenta',
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
      confirm: 'Desconectar igualmente',
    },
  },
}

import type { Translation } from '../en'

export const tiers: Translation['tiers'] = {
  ledger: {
    title: 'Elige un plan',
    gatedLead:
      '{{workspace}} necesita uno antes de que nadie pueda seguir trabajando. No se toca nada de lo que has creado.',
    waitingTitle: 'A la espera de la persona propietaria',
    waitingBody:
      'Solo una persona propietaria de {{workspace}} puede elegir un plan. Esta página abre el espacio de trabajo en cuanto lo haga.',
    switchWorkspace: 'CAMBIAR DE ESPACIO',
    signOut: 'CERRAR SESIÓN',
    save: 'AHORRA UN {{percent}} %',
    mostPopular: 'EL MÁS ELEGIDO',
    chargedToday: 'SE COBRA HOY',
    freeMonthThen: 'UN MES GRATIS, LUEGO',
    currentLabel: 'TU PLAN',
    perMonth: '/ mes',
    billedMonthly: 'Facturado cada mes · IVA no incluido',
    billedYearly: 'Facturado {{total}} al año · IVA no incluido',
    allowances: 'INCLUYE',
    chooseNamed: 'ELEGIR {{name}}',
    startFreeMonth: 'EMPEZAR EL MES GRATIS',
    currentPlan: 'PLAN ACTUAL',
    scheduled: 'PROGRAMADO',
    unavailable: 'AÚN NO DISPONIBLE',
    noneOnSale: 'Ahora mismo no hay ningún plan a la venta.',
    vatNote:
      'Los precios no incluyen IVA. Lemon Squeezy vende Ogen como comerciante registrado y lo añade al pagar.',
    compTitle: 'Elige el plan que quieras',
    compLead: '{{workspace}} tiene acceso gratuito a la beta.',
    compTryAny:
      'Prueba cualquier plan todo el tiempo que quieras: no se cobra nada.',
    freeWhileTesting: 'GRATIS MIENTRAS PRUEBAS',
    switchNamed: 'CAMBIAR A {{name}}',
    compNote:
      'El acceso a la beta es gratuito mientras pruebas. Si termina, Ogen te avisa antes y no se toca nada de lo que hayas creado.',
    hiddenTierTitle:
      'Estás en {{name}}, el plan que el equipo de Ogen preparó para tus pruebas',
    hiddenTierBody:
      'No es uno de los planes de abajo. Cambiar a uno es gratis y se aplica al momento, pero solo el equipo de Ogen puede volver a poner este espacio en {{name}}.',
    compEndedTitle: 'Tu acceso gratuito a la beta ha terminado',
    compEndedBodyFreeMonth:
      'Gracias por probar Ogen. Elige un plan para continuar: tu primer mes en {{name}} es gratis, porque esta cuenta nunca ha tenido uno.',
    compEndedBody:
      'Gracias por probar Ogen. Elige un plan para continuar: no se ha tocado nada de lo que hayas creado.',
  },
  checkout: {
    confirmingTitle: 'Confirmando tu suscripción',
    confirmingBody:
      'Lemon Squeezy ya tiene tus datos. {{workspace}} se abre en cuanto lo confirmen; suele tardar unos segundos.',
    stepCheckout: 'Pago completado',
    stepConfirm: 'Esperando la confirmación de Lemon Squeezy',
    stepOpen: 'Abriendo {{workspace}}',
    openedTitle: 'Termina el pago en la pestaña nueva',
    openedTrial: 'Tu primer mes es gratis: hoy no se cobra nada.',
    openedCharged: 'Se te cobra al completar el pago.',
    openedBody:
      'Esta página continúa sola en cuanto Lemon Squeezy lo confirme y abre {{workspace}}.',
    reopen: 'VOLVER A ABRIR EL PAGO',
    back: 'ELEGIR OTRO PLAN',
    slowTitle: 'Está tardando más de lo normal',
    slowBody:
      'Deja esta página abierta o vuelve más tarde: no se te cobrará dos veces. El recibo de Lemon Squeezy tiene la referencia del pedido.',
    subscribed: 'Ya tienes {{name}}.',
  },
  changeDialog: {
    title: '¿Pasar a {{name}}?',
    body: 'Lemon Squeezy calcula la diferencia: subir de plan empieza hoy; bajar espera al final del periodo que ya has pagado.',
    trialBody:
      'Esto termina hoy el mes gratis de {{name}} y se cobra {{target}} ahora.',
    cancel: 'CANCELAR',
    confirm: 'PASAR A {{name}}',
    blockedTitle: 'No durante el mes gratis',
    blockedBody:
      '{{name}} no se puede cambiar hasta que termine su mes gratis el {{when}}. Vuelve a elegir entonces, o termina el mes gratis en Lemon Squeezy y vuelve.',
    blockedBodyBare:
      '{{name}} no se puede cambiar hasta que termine su mes gratis. Termínalo en Lemon Squeezy o vuelve a elegir cuando acabe.',
    nothingCharged: 'No se ha cobrado nada y sigues en {{name}}.',
    ok: 'ACEPTAR',
  },
  planError: {
    stale:
      'Ese plan ya no se puede elegir. Recarga la página para ver lo que hay disponible.',
    notAvailable: 'Ese plan no está a la venta ahora mismo.',
    notChangeable:
      'Esta suscripción no se puede cambiar desde aquí. Gestiónala en Lemon Squeezy.',
    duringTrial: 'No puedes cambiar de plan durante el mes gratis.',
    provider: 'Lemon Squeezy no respondió. Inténtalo de nuevo en un momento.',
    unavailable: 'La facturación no está disponible ahora mismo.',
  },
  freeUntil: 'Gratis hasta el {{when}}; después, {{price}}.',
  freeUntilBare: 'Gratis hasta el {{when}}.',
  statusOnTrial: 'Mes gratis',
  billingUnavailable:
    'Los datos de facturación no están disponibles ahora mismo, así que no hay nada que gestionar desde aquí.',
  sandbox: 'Pruebas',
  noPortal: 'Todavía no hay nada que gestionar en Lemon Squeezy.',
  priceExclVat: '{{price}}, IVA no incluido',
  perMonth: '{{price}} / mes',
  perYear: '{{price}} / año',
  keepPlan: 'MANTENER {{name}}',
  notInPlan: 'No está en tu plan',
  notInPlanBody:
    'Esto no forma parte del plan de tu espacio de trabajo. Al mejorarlo, se activa para todo el equipo.',

  limitReached: 'Has alcanzado tu límite',
  resets: 'Tu cuota vuelve a estar completa el {{when}}.',

  deniedTier: 'Esto no está incluido en tu plan.',
  deniedLimit_one: 'Ya has usado el único que permite tu plan.',
  deniedLimit_other: 'Ya has usado los {{count}} que permite tu plan.',
  deniedLimitFlat: 'Ya has usado todo lo que tu plan permite aquí.',

  usage: '{{used}} de {{limit}}',
  usageMonth: '{{used}} de {{limit}} este mes',
  usageTotal: '{{used}} de {{limit}} usados',
  usagePost: '{{used}} de {{limit}} en esta publicación',
  limitOnly: '{{limit}} incluidos',
  unlimited: 'Sin límite',

  upgrade: 'MEJORAR PLAN',

  paywall: {
    label: 'Mejora tu plan',
    title: 'Consigue más con el plan {{plan}} de Ogen',
    titleTop: '{{plan}} es lo máximo para esto',
    reasonTier: '{{feature}} no está incluido en {{plan}}.',
    reasonTierOther: 'Esto no está incluido en {{plan}}.',
    reasonLimit: {
      team_seats: 'Has ocupado todos los puestos de {{plan}}.',
      workspaces: 'Has usado todos los espacios de trabajo de {{plan}}.',
      connected_accounts:
        'Has conectado todas las cuentas que permite {{plan}}.',
      active_campaigns: 'Has usado todas las campañas activas de {{plan}}.',
      plan_runs_per_month:
        'Has usado los planes de contenido de este mes en {{plan}}.',
      quality_reviews_per_post:
        'Has usado las revisiones de calidad de esta publicación en {{plan}}.',
      posts_total: 'Has usado todas las publicaciones de {{plan}}.',
      content_bank_assets: 'Tu banco de contenido está lleno en {{plan}}.',
      web_page_imports:
        'Has usado todas las importaciones de páginas web de {{plan}}.',
      media_storage_bytes:
        'Has usado todo el almacenamiento multimedia de {{plan}}.',
      assistant_multiplier:
        'Has usado la asignación del asistente en {{plan}}.',
    },
    reasonLimitOther: 'Has alcanzado un límite en {{plan}}.',
    bodyTier: 'Mejorar el plan lo activa para todo el espacio de trabajo.',
    bodyLimit: 'Todo lo que has creado se queda tal cual.',
    bodyResets:
      'Tu asignación se renueva el {{when}}, o mejora ahora para seguir.',
    noOffer:
      'Ningún plan a la venta ofrece más de esto que el tuyo. Compara los planes para ver todo lo que incluye cada uno.',
    billing: 'Periodo de facturación',
    monthly: 'Mensual',
    yearly: 'Anual',
    perMonth: '<price>{{price}}</price> / mes',
    billedYearly: '{{total}} facturados al año',
    billedYearlySaving: '{{total}} facturados al año, ahorras {{saving}}',
    upgradeTo: 'PASAR A {{plan}}',
    planName: 'Ogen {{plan}}',
    comparePlans: 'Comparar todos los planes',
    seeAllFeatures: 'Ver todas las funciones',
    benefit: {
      team_seats: {
        limit_one: '{{count}} miembro del equipo',
        limit_other: '{{count}} miembros del equipo',
        unlimited: 'Miembros del equipo sin límite',
        description: 'Invita a tu equipo a planificar y publicar contigo.',
      },
      workspaces: {
        limit_one: '{{count}} espacio de trabajo',
        limit_other: '{{count}} espacios de trabajo',
        unlimited: 'Espacios de trabajo sin límite',
        description: 'Mantén separadas tus marcas o clientes.',
      },
      connected_accounts: {
        limit_one: '{{count}} cuenta conectada',
        limit_other: '{{count}} cuentas conectadas',
        unlimited: 'Cuentas conectadas sin límite',
        description: 'Publica en más de tus perfiles sociales.',
      },
      active_campaigns: {
        limit_one: '{{count}} campaña activa',
        limit_other: '{{count}} campañas activas',
        unlimited: 'Campañas activas sin límite',
        description: 'Lleva más campañas a la vez.',
      },
      plan_runs_per_month: {
        limit_one: '{{count}} plan de contenido al mes',
        limit_other: '{{count}} planes de contenido al mes',
        unlimited: 'Planes de contenido sin límite',
        description: 'Deja que Ogen redacte las publicaciones de una campaña.',
      },
      quality_reviews_per_post: {
        limit_one: '{{count}} revisión de calidad por publicación',
        limit_other: '{{count}} revisiones de calidad por publicación',
        unlimited: 'Revisiones de calidad sin límite',
        description: 'Revisa cada publicación antes de que salga.',
      },
      posts_total: {
        limit_one: '{{count}} publicación',
        limit_other: '{{count}} publicaciones',
        unlimited: 'Publicaciones sin límite',
        description: 'Sigue escribiendo sin contar lo que queda.',
      },
      content_bank_assets: {
        limit_one: '{{count}} documento en el banco de contenido',
        limit_other: '{{count}} documentos en el banco de contenido',
        unlimited: 'Documentos sin límite en el banco de contenido',
        description:
          'Guarda las notas, archivos y páginas en las que se basan tus publicaciones.',
      },
      web_page_imports: {
        limit_one: '{{count}} importación de página web',
        limit_other: '{{count}} importaciones de páginas web',
        unlimited: 'Importaciones de páginas web sin límite',
        description: 'Convierte cualquier página web en material de origen.',
      },
      media_storage_bytes: {
        limit: '{{value}} de almacenamiento multimedia',
        unlimited: 'Almacenamiento multimedia sin límite',
        description: 'Espacio para las imágenes y vídeos de tus publicaciones.',
      },
      multiple_accounts_per_platform: {
        included: 'Varias cuentas en una plataforma',
        description: 'Conecta dos perfiles de la misma red.',
      },
      all_campaign_types: {
        included: 'Todos los tipos de campaña',
        description: 'Todos los formatos de campaña, no solo los atemporales.',
      },
      custom_campaign_types: {
        included: 'Tipos de campaña personalizados',
        description: 'Define tus propios tipos de campaña.',
      },
    },
    planPitch: 'Todo lo de {{current}}, con más margen para crecer.',
    unpriced: 'El precio aún no está publicado.',
  },
  seePlans: 'VER PLANES',
  ownersOnlyPlan:
    'Solo un propietario del espacio puede cambiar el plan para todo el equipo.',

  suspended: 'Solo lectura',
  suspendedBody:
    'Tu plan ha cambiado, así que esto es de solo lectura por ahora. No se ha eliminado nada: sigue todo aquí, y al mejorar el plan vuelve a ser editable.',
  suspendedSince: 'De solo lectura desde el {{when}}.',

  planLoadFailed: 'No se han podido cargar los planes.',
  plansClose: 'Cerrar los planes',
  changePlan: 'CAMBIAR',

  billingTitle: 'Plan y facturación',
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
  retired: 'Ya no se ofrece',
  since: 'En este plan desde el {{when}}.',

  onPlan: 'Estás en el plan {{name}}.',
  onPlanMonthly: 'Estás en el plan {{name}}, con facturación mensual.',
  onPlanYearly: 'Estás en el plan {{name}}, con facturación anual.',

  autoRenews: 'Se renueva automáticamente el {{when}}.',
  autoRenewsIn: 'Se renueva automáticamente {{relative}}, el {{when}}.',

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
  switched: 'Has cambiado a {{name}}',
  switchedBody: 'Los nuevos límites se aplican al momento.',
  switchNamed: 'Cambiar a {{name}}',
  leaveHidden: {
    title: '¿Dejar {{name}}?',
    body: 'Cambiar a {{target}} es gratis y se aplica al momento. Solo el equipo de Ogen puede volver a poner este espacio en {{name}}.',
    cancel: 'CANCELAR',
  },
  comp: {
    tag: 'Acceso beta',
    sentence: 'Gratuito: no hay nada que pagar.',
    payment:
      'No hay ninguna tarjeta guardada, y no hace falta mientras este espacio tenga acceso gratuito a la beta. Si termina, te pediremos que elijas un plan y Lemon Squeezy te pedirá los datos de pago entonces.',
  },
  changeCancelled: 'Se ha anulado ese cambio.',

  limitFlat: '{{value}}',
  limitMonth: '{{value}} al mes',
  limitTotal: '{{value}} en total',
  limitPost: '{{value}} por publicación',
  included: 'Incluido',
  excluded: 'No incluido',

  price: '<price>{{price}}</price> / mes',
  priceYear: '<price>{{price}}</price> / año',
  priceFree: 'Gratis',

  features: {
    team_seats: 'Miembros del equipo',
    workspaces: 'Espacios de trabajo',
    connected_accounts: 'Cuentas conectadas',
    multiple_accounts_per_platform: 'Varias cuentas en una misma plataforma',
    active_campaigns: 'Campañas',
    all_campaign_types: 'Todos los tipos de campaña',
    custom_campaign_types: 'Tipos de campaña personalizados',
    plan_runs_per_month: 'Ejecuciones del plan de contenido',
    quality_reviews_per_post: 'Revisiones de calidad',
    posts_total: 'Publicaciones',
    content_bank_assets: 'Documentos del banco de contenido',
    web_page_imports: 'Importaciones de páginas web',
    media_storage_bytes: 'Almacenamiento multimedia',
  },
}

import type { Translation } from '../en'

export const onboarding: Translation['onboarding'] = {
  progress: 'Configuración',
  skip: 'Saltar la configuración',
  back: 'Atrás',
  continue: 'Continuar',
  stages: {
    you: 'Sobre ti',
    sources: 'Qué lee Ogen',
    brand: 'La marca',
    accounts: 'Cuentas',
  },
  stageDone: '{{stage}}, hecho',
  stageCurrent: '{{stage}}, paso actual',
  saving: 'Guardando…',
  saved: 'Guardado',
  you: {
    title: '¿Para quién escribe Ogen?',
    lead: 'Un espacio de trabajo guarda una marca: su voz, sus audiencias, sus cuentas y sus campañas. ¿Trabajas para varios clientes? Cada uno tiene su propio espacio de trabajo.',
    client: {
      title: 'Un cliente',
      body: 'Haces marketing para otras empresas, como freelance o desde una agencia.',
    },
    own: {
      title: 'Mi propio negocio',
      body: 'Haces marketing para el negocio que diriges o en el que trabajas.',
    },
    nameClient: 'Nombre del cliente',
    nameOwn: 'Nombre del negocio',
    nameHint: 'Opcional. Será el nombre del espacio de trabajo.',
  },
  sources: {
    title: '¿Qué puede leer Ogen sobre {{name}}?',
    lead: 'Ogen aprende cómo suenan a partir de lo que ya existe. Añade lo que tengas; cada cosa se lee en cuanto la añades, y nada es obligatorio.',
    leadTogether:
      'Ogen aprende cómo suenan a partir de lo que ya existe. Añade lo que tengas; nada es obligatorio.',
    website: {
      title: 'Sitio web',
      body: 'Ogen lee hasta 10 de sus páginas.',
    },
    documents: {
      title: 'Documentos',
      body: 'Un manual de marca, un dosier de prensa, ofertas.',
      more: 'Más documentos',
    },
    questions: {
      title: 'Unas preguntas',
      body: '¿Poco por escrito? Una frase cada una.',
    },
    websiteLabel: 'Dirección del sitio web',
    websiteHint: 'Ogen lee la página de inicio y hasta 9 páginas por debajo.',
    add: 'Añadir el sitio web',
    drop: 'Suelta los archivos aquí, o',
    choose: 'elígelos',
    formats: 'PDF, Word o Markdown',
    answerLabel: 'Tu respuesta',
    addAnswers: 'Añadir las respuestas',
    cancel: 'Cerrar',
    remove: 'Quitar {{name}}',
    pages_one: '{{formatted}} página',
    pages_other: '{{formatted}} páginas',
    uploading: 'Subiendo',
    reading: 'Leyendo, cerca de un minuto',
    done: 'Leído',
    stopped: 'Detenido',
    queued: 'Se lee al continuar',
    failed: 'No se pudo subir',
    retry: 'Leer de nuevo',
    answered_one: '{{formatted}} respuesta',
    answered_other: '{{formatted}} respuestas',
    continue: 'Continuar',
    readingHint:
      'Cada uno tarda cerca de un minuto. Puedes esperar aquí o añadir más mientras tanto.',
    readHint:
      'Después verás qué ha sacado Ogen de ellos. Nada entra en la marca hasta que lo revises.',
    togetherHint:
      'Al continuar, Ogen lo lee todo junto, en uno o dos minutos. Nada entra en la marca hasta que lo revises.',
    later: 'Hacerlo más tarde',
    tryAgain: 'Reintentar',
    withoutRead: 'Continuar sin leer',
    stop: {
      body: 'Ogen todavía está leyendo. Si sigues ahora, la lectura se detiene y la hoja de la derecha no se completa con lo que añadiste. Puedes volver a leerlo desde Fundamentos más tarde.',
      keep: 'Seguir leyendo',
      go: 'Seguir de todos modos',
    },
  },
  brand: {
    readingTitle: 'Leyendo lo que diste',
    readingLead:
      'Puedes quedarte a mirar o volver luego; la lectura sigue de todos modos.',
    reviewTitle: 'Lo que Ogen ha sacado',
    reviewLead:
      'Todo empieza conservado. Descarta lo que esté mal y corrige lo que se acerque. Nada se guarda hasta que continúes.',
    nameLabel: 'Nombre',
    namedByYou: 'Puesto por ti',
    namedFrom: 'De {{source}}',
    siteSays: 'El sitio web dice «{{name}}».',
    useSite: 'Usar ese',
    keep: 'Guardar en la marca',
    kept: '{{kept}} de {{total}} conservados',
    failedTitle: 'Ogen no pudo leer la marca',
    failedLead:
      'No se guardó nada. Puedes volver a leerla desde Fundamentos cuando termines la configuración.',
    closedTitle: 'Esta lectura ha terminado',
    closedLead:
      'Se guardó, se descartó o se quedó sin tiempo. Fundamentos tiene lo que se conservó.',
    saveFailed: 'La marca no se guardó. Inténtalo de nuevo.',
  },
  accounts: {
    title: '¿Dónde publica {{name}}?',
    leadClient:
      'Conecta las cuentas que gestionas para ellos. Si el acceso lo tiene el cliente, sáltala por ahora y conéctala más tarde en Ajustes.',
    leadOwn: 'Conecta las cuentas desde las que publicas.',
    connect: 'Conectar',
    connected: 'Conectada',
    later:
      'Puedes conectar más en cualquier momento en Ajustes del espacio de trabajo.',
    finish: 'Terminar la configuración',
    none: 'Terminar sin cuentas',
    connectFailed:
      'Esa cuenta no se conectó. Inténtalo de nuevo o conéctala más tarde en Ajustes del espacio de trabajo.',
    linkFailed:
      'No se pudo empezar a conectar {{platform}}. Inténtalo de nuevo en un minuto.',
  },
  sheet: {
    title: 'Lo que Ogen necesita',
    to: 'para sonar como {{name}}',
    unnamedClient: 'tu cliente',
    unnamedOwn: 'tu negocio',
    meter: '{{count}} de {{total}} suficientes',
    verdict: {
      none: 'Todavía no hay nada en qué basarse.',
      some: 'Un comienzo. Las publicaciones aún sonarían como las de cualquiera.',
      most: 'Suficiente para empezar a escribir.',
      all: 'Suficiente para sonar como ellos.',
    },
    levels: {
      missing: 'Falta',
      thin: 'Escaso',
      enough: 'Suficiente',
    },
    needs: {
      apart: {
        label: 'Qué los distingue',
        hint: 'Las páginas de inicio y «quiénes somos» del sitio web, o un manual de marca.',
      },
      voice: {
        label: 'Tono de voz',
        hint: 'Publicaciones que ya han hecho, o la sección de tono de un manual de marca.',
      },
      audience: {
        label: 'A quién se dirigen',
        hint: 'Una página «quiénes somos», un dosier de prensa o las preguntas.',
      },
      onlyThey: {
        label: 'Lo que solo ellos pueden decir',
        hint: 'Datos, cifras y ofertas: un dosier de prensa o una hoja de ofertas.',
      },
      never: {
        label: 'Lo que nunca dicen',
        hint: 'Lo que no se hace según un manual de marca, o tus propias notas.',
      },
      channels: {
        label: 'Dónde publican',
        hint: 'Conecta una cuenta.',
      },
    },
  },
}

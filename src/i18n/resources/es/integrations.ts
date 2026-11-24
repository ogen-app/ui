import type { Translation } from '../en'

export const integrations: Translation['integrations'] = {
  figma: {
    connect: {
      title: 'Conectar el plugin de Figma',
      requestedFrom: 'Solicitado el {{time}} desde {{ip}}',
      requestedAt: 'Solicitado el {{time}}',
      workspaceLabel: 'Enviar imágenes a',
      workspacesFailed:
        'No se pudieron cargar tus espacios de trabajo. Recarga la página para volver a intentarlo.',
      warning:
        'Permítelo solo si acabas de hacer clic en <strong>Conectar</strong> en el plugin de Ogen dentro de Figma. Así el plugin podrá añadir imágenes a <strong>{{workspace}}</strong> y ver los títulos de tus borradores.',
      allow: 'Permitir',
      deny: 'Denegar',
      answerFailed:
        'No se pudo completar. Comprueba tu conexión e inténtalo de nuevo.',
      signedInAs: 'Sesión iniciada como {{email}}',
      expired: {
        title: 'Este enlace ha caducado',
        body: 'Los enlaces de conexión solo duran unos minutos. Vuelve a Figma y haz clic de nuevo en Conectar en el plugin de Ogen.',
      },
      answered: {
        title: 'Ya respondida',
        body: 'Esta solicitud de conexión ya se permitió o denegó. Si el plugin sigue pidiéndote conectar, haz clic de nuevo en Conectar en Figma.',
      },
      denied: {
        title: 'Solicitud denegada',
        body: 'El plugin no se ha conectado. Puedes cerrar esta pestaña.',
      },
      success: {
        title: 'Conectado',
        body: 'El plugin de Figma ya puede enviar imágenes a <strong>{{workspace}}</strong>. Vuelve a Figma; puedes cerrar esta pestaña.',
      },
      loadFailed: {
        title: 'Algo ha salido mal',
        body: 'No se pudo cargar la solicitud de conexión.',
      },
    },
    settings: {
      title: 'Plugin de Figma',
      loadFailed: 'No se pudieron cargar las conexiones de Figma.',
      empty: {
        body: 'Envía marcos de Figma directamente a los recursos de este espacio de trabajo, o a un borrador, sin exportarlos antes.',
        steps:
          'Para conectar, abre Figma y ve a <strong>Plugins → Ogen → Connect</strong>.',
        communityLink: 'Consigue el plugin en Figma Community',
      },
      member: '{{name}}',
      connectedOn: 'Conectado el {{date}}',
      lastUsed: 'Último uso el {{date}}',
      neverUsed: 'Aún sin usar',
      disconnect: 'Desconectar',
    },
    disconnect: {
      title: '¿Desconectar {{label}}?',
      body: '<strong>{{label}}</strong> dejará de poder enviar imágenes. La próxima vez que alguien lo use, Figma pedirá conectar de nuevo.',
      keepsImages: 'Las imágenes que ya envió se quedan en tus recursos.',
      forbidden:
        'Solo el miembro que conectó este plugin, o un propietario del espacio de trabajo, puede desconectarlo.',
      failed:
        'No se pudo desconectar el plugin. Inténtalo de nuevo en un momento.',
      keep: 'Mantener conectado',
      confirm: 'Desconectar',
      succeeded: '{{label}} desconectado',
    },
  },
}

import type { Translation } from '../en'

export const tasks: Translation['tasks'] = {
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
}

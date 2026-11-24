import type { Translation } from '../en'

export const calendar: Translation['calendar'] = {
  unscheduled: 'Sin programar',
  unscheduledPosts: 'Publicaciones sin programar',
  settings: 'Ajustes del calendario',
  viewWeek: 'Semana',
  viewMonth: 'Mes',

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
  seriesDay: 'Una serie publica este día',
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

  untitledCampaign: 'Campaña sin título',

  loadFailed:
    'No se pudieron cargar tus publicaciones: el calendario se rellenará cuando vuelvan a estar disponibles.',
  loadFailedCampaign:
    'No se pudieron cargar las publicaciones de esta campaña: el calendario se rellenará cuando vuelvan a estar disponibles.',

  imagePreviews: 'Mostrar las tarjetas con vista previa de la imagen',
  imagePreviewsNote:
    'Solo las publicaciones que tienen imagen y, en el mes, solo en los días con espacio para una',
  weekCard: 'TARJETA DE SEMANA',
  monthCard: 'TARJETA DE MES',
  addPostOn: 'Añadir una publicación el {{date}}',
  addPostTo: 'Añadir una publicación a',
  density_one: '{{count}} publicación el {{date}} — abrir esta semana',
  density_other: '{{count}} publicaciones el {{date}} — abrir esta semana',
  densityTicked_one: '{{formatted}} marcada',
  densityTicked_other: '{{formatted}} marcadas',
  today: 'Hoy',

  notScheduled: 'Sin programar',
  /**
   * The Not scheduled panel's two groups: posts with an account to publish
   * as, and the ones the schedule gate would refuse for want of one —
   * folded away by default, with each row's reason in amber.
   */
  readyToSchedule: 'Listas para programar',
  noneReady: 'Nada está listo para programar',
  needsAccount: 'Necesitan una cuenta',
  /** A row's reason, worded as what to do about it. */
  accountGap: {
    noPlatform: 'Elige una plataforma',
    noAccount: 'Conecta una cuenta',
    chooseAccount: 'Elige una cuenta',
    accountGone: 'Cuenta desconectada',
  },
  justWritten: 'RECIÉN ESCRITA',
  fromIdeas_one: 'de {{formatted}} idea',
  fromIdeas_other: 'de {{formatted}} ideas',
  addPost: 'Añadir publicación',
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
    workspaceTitle: 'Todavía no hay nada planificado',
    workspaceSubtitle:
      'Las publicaciones se escriben dentro de una campaña. Programa una y aparecerá aquí, sea cual sea la campaña a la que pertenezca.',
    workspacePanelSubtitle:
      'Las publicaciones sin fecha esperan aquí — arrastra una al calendario para darle una.',
    workspaceListTitle: 'Aún no hay publicaciones',
    workspaceListSubtitle:
      'Las publicaciones se escriben dentro de una campaña. Añade una allí y aparecerá aquí, sea cual sea la campaña a la que pertenezca.',
  },
}

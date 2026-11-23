import type { Translation } from '../en'

export const postsFilter: Translation['postsFilter'] = {
  setByAssistant: 'puesto por el asistente',
  unknownPlatform: 'Una plataforma retirada',
  nothingMatches: 'Ninguna publicación coincide con estos filtros',
  scheduled: {
    yes: 'Con fecha',
    no: 'Sin fecha',
  },
  sentence: {
    showing: 'Mostrando publicaciones <clauses></clauses>',
    showingAll: 'Mostrando <v>todas las publicaciones</v>',
    clause: {
      status: 'que son <v>{{values}}</v>',
      status_not: 'que no son <v>{{values}}</v>',
      platform: 'en <v>{{values}}</v>',
      platform_not: 'fuera de <v>{{values}}</v>',
      post_type: 'en formato <v>{{values}}</v>',
      post_type_not: 'que no están en formato <v>{{values}}</v>',
      scheduled: '<v>{{values}}</v>',
      date: 'programadas <v>desde el {{values}}</v>',
      date_range: 'programadas <v>entre el {{from}} y el {{to}}</v>',
      date_not: 'programadas <v>antes del {{values}}</v>',
    },
    status: {
      planned: 'planificadas',
      draft: 'borradores',
      ready_for_publish: 'listas para publicar',
      scheduled: 'programadas',
      scheduled_for_manual_publishing: 'programadas para publicar a mano',
      failed: 'fallidas',
      published: 'publicadas',
      not_published: 'no publicadas',
    },
    scheduled: {
      yes: 'con fecha',
      no: 'sin fecha',
    },
    question: {
      status: 'Publicaciones que son…',
      platform: 'Publicaciones en…',
      post_type: 'Publicaciones en formato…',
      scheduled: 'Publicaciones…',
      date: 'Publicaciones programadas…',
    },
    include: {
      status: 'son',
      platform: 'en',
      post_type: 'en',
      date: 'entre',
    },
    exclude: {
      status: 'no son',
      platform: 'fuera de',
      post_type: 'no en',
      date: 'antes',
    },
    starter: {
      status: 'que son…',
      platform: 'en una plataforma…',
      post_type: 'en un formato…',
      scheduled: 'con fecha, o sin ella…',
      date: 'programadas…',
    },
    starterHint: {
      status: 'borradores, fallidas',
    },
    posts_one: '{{formatted}} publicación',
    posts_other: '{{formatted}} publicaciones',
  },
}

import type { Translation } from '../en'

export const formats: Translation['formats'] = {
  none: 'Sin forma',
  'how-to': {
    label: 'Cómo se hace',
    hint: 'Pasos que alguien puede seguir para obtener un resultado.',
  },
  explainer: {
    label: 'Explicación',
    hint: 'Por qué algo funciona como funciona.',
  },
  listicle: {
    label: 'Lista',
    hint: 'Un conjunto numerado, cada punto se sostiene solo.',
  },
  story: {
    label: 'Relato',
    hint: 'Algo que ocurrió, contado en orden.',
  },
  digest: {
    label: 'Resumen',
    hint: 'Varios elementos recopilados de un período.',
  },
  opinion: {
    label: 'Opinión',
    hint: 'Una postura, argumentada.',
  },
  question: {
    label: 'Preguntas y respuestas',
    hint: 'Una pregunta respondida, o planteada al público.',
  },
  announcement: {
    label: 'Anuncio',
    hint: 'Noticias sobre nosotros, dichas una vez y con claridad.',
  },
}

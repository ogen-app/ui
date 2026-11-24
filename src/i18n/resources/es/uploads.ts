import type { Translation } from '../en'

export const uploads: Translation['uploads'] = {
  limitText: 'Markdown hasta {{md}}, PDF hasta {{pdf}}',
  limitDocuments:
    'Archivos de Word, Excel, PowerPoint, OpenDocument, EPUB, CSV, HTML, correo, RTF y texto hasta {{size}}',
  limitImages: 'Imágenes: JPEG, PNG, WebP, GIF, HEIC, AVIF, TIFF y BMP',
  limitAudio:
    'Audio: MP3, WAV, M4A, AAC, OGG, Opus, FLAC, WebM y AIFF hasta {{size}}',
  backgroundNote:
    'Todo salvo el Markdown se lee en segundo plano, así que termina después de subirse.',
  browse: 'Suelta los archivos aquí o haz clic para elegirlos',
  remove: 'Quitar {{name}}',
  failed: 'No se ha podido subir',
  cancel: 'Cancelar',
  submit: 'Subir',
  submitCount: 'Subir ({{n}})',
  dropInto: 'Añadir a {{scope}}',
  duplicate: 'Ya está en el banco de contenido como «{{title}}»',

  errors: {
    type: 'Este tipo de archivo no se puede añadir al banco de contenido.',
    legacyOffice:
      'Los archivos de Office antiguos o protegidos con contraseña no se pueden leer. Guárdalo como .docx, .xlsx o .pptx sin protección y sube ese.',
    unsupportedType:
      'El contenido de este archivo no es de un tipo que podamos leer.',
    vector:
      'Las imágenes SVG y otras vectoriales no se admiten. Expórtala antes como PNG o JPEG.',
    tooBig: 'Este archivo supera el límite de {{limit}}.',
    tooBigUnstated: 'Este archivo es demasiado grande para subirlo.',
    dimensions:
      'Esta imagen es demasiado grande para guardarla: el límite es {{max}}.',
    dimensionsUnstated: 'Esta imagen tiene demasiados píxeles para guardarla.',
    duration_one:
      'Esta grabación supera el límite de {{count}} minuto de tu plan.',
    duration_other:
      'Esta grabación supera el límite de {{count}} minutos de tu plan.',
    durationUnstated: 'Esta grabación es más larga de lo que permite tu plan.',
    quota:
      'Se ha alcanzado el límite del banco de contenido de tu plan, así que no se ha añadido.',
    unavailable:
      'Ahora mismo no se pueden leer archivos como este. Vuelve a intentarlo en unos minutos.',
    partial: 'Solo se ha podido leer una parte.',
    empty: 'Este archivo está vacío.',
    notPdf: 'Este archivo no es un PDF legible.',
    invalid: 'No se ha podido leer este archivo; puede que esté dañado.',
    notConfigured: 'Este servidor todavía no puede guardar imágenes.',
    undecodable: 'No se ha podido leer esta imagen; puede que esté dañada.',
    server: 'Algo ha fallado al guardar este archivo. Inténtalo de nuevo.',
    storage:
      'No se ha podido enviar el archivo al almacenamiento. Vuelve a intentarlo; si sigue fallando, el almacenamiento aún no acepta subidas desde esta aplicación.',
  },
}

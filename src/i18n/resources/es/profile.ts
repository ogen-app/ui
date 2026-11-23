import type { Translation } from '../en'

export const profile: Translation['profile'] = {
  title: 'Perfil',
  account: {
    title: 'Cuenta',
    description:
      'Datos personales. Los ajustes del espacio de trabajo, incluido quién más tiene acceso, están en Ajustes del espacio.',
    firstName: 'Nombre',
    lastName: 'Apellidos',
    email: 'Correo electrónico',
    emailWarning:
      'Esta es la dirección con la que inicias sesión. Cambia en cuanto guardes, y no se envía ninguna confirmación para comprobar que funciona — una errata aquí te deja fuera en el próximo inicio de sesión.',
  },
  password: {
    sentBody:
      'Un enlace para establecer una nueva contraseña va de camino a <email>{{email}}</email>. Caduca en una hora, y usarlo cierra la sesión en todos los dispositivos — incluido este.',
    send: 'ENVIARME UN ENLACE DE RESTABLECIMIENTO',
    resend: 'ENVIARLO DE NUEVO',
    resentNote: 'Enviado de nuevo — dale un minuto.',
  },
  signInMethods: {
    title: 'Formas de iniciar sesión',
    loadFailed: 'No hemos podido cargar tus formas de iniciar sesión.',
    password: 'Contraseña',
    passwordSet: 'Correo y contraseña',
    passwordNotSet: 'Sin contraseña — inicias sesión con Google',
    setPassword: 'ELEGIR UNA CONTRASEÑA',
    google: 'Google',
    googleConnected: '{{email}} · conectado el {{date}}',
    googleNotConnected: 'Sin conectar',
    connect: 'CONECTAR',
    disconnect: 'DESCONECTAR',
    onlyWayIn:
      'Google es tu única forma de entrar. Elige primero una contraseña y después podrás desconectarlo.',
    connectedToast: 'Google conectado',
    connectFailedToast: 'No hemos podido conectar Google',
  },
  dangerZone: {
    title: 'Zona de peligro',
    body: 'Salir de este espacio te quita el acceso y elimina todo lo que creaste en él — para todos. Tu cuenta de acceso y tus otros espacios no se tocan. Esto no se puede deshacer.',
    action: 'Salir de este espacio',
  },
  leave: {
    title: '¿Salir de {{workspace}}?',
    body: 'Esto elimina a <strong>{{email}}</strong> del espacio y borra todo lo que creaste en él — tus campañas, sus publicaciones, los recursos que subiste y las etiquetas — para todos los miembros. Las publicaciones ya enviadas siguen activas en las redes sociales. No se puede deshacer.',
    shared:
      'Tu cuenta de acceso sigue funcionando: cualquier otro espacio al que pertenezcas no se toca, y <strong>{{workspace}}</strong> continúa sin ti. Si eres su único propietario, nombra antes a otro propietario — un espacio no puede quedarse sin propietario.',
    thisWorkspace: 'este espacio',
    confirmLabel: 'Escribe <email>{{email}}</email> para confirmar',
    keep: 'QUEDARME EN ESTE ESPACIO',
    confirm: 'SALIR DE ESTE ESPACIO',
  },
}

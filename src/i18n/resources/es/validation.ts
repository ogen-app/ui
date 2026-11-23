import type { Translation } from '../en'

export const validation: Translation['validation'] = {
  firstName: {
    required: 'El nombre es obligatorio',
    tooLong: 'El nombre no puede superar los 50 caracteres',
    whitespace: 'El nombre no puede ser solo espacios en blanco',
  },
  lastName: {
    required: 'Los apellidos son obligatorios',
    tooLong: 'Los apellidos no pueden superar los 50 caracteres',
    whitespace: 'Los apellidos no pueden ser solo espacios en blanco',
  },
  organizationName: {
    required: 'El nombre de la organización es obligatorio',
    tooLong: 'El nombre de la organización no puede superar los 100 caracteres',
    whitespace:
      'El nombre de la organización no puede ser solo espacios en blanco',
  },
  email: {
    required: 'El correo electrónico es obligatorio',
    invalid: 'El formato del correo electrónico no es válido',
  },
  password: {
    required: 'La contraseña es obligatoria',
    tooShort: 'La contraseña debe tener al menos 8 caracteres',
    needsUppercase: 'Debe contener una letra mayúscula',
    needsLowercase: 'Debe contener una letra minúscula',
    needsDigit: 'Debe contener un dígito',
  },
  confirmPassword: {
    required: 'Confirma tu contraseña',
    mismatch: 'Las contraseñas no coinciden',
  },
  passwordRules: {
    minChars: 'Mín. 8 caracteres',
    uppercase: 'una mayúscula',
    lowercase: 'una minúscula',
    digit: 'un dígito',
    separator: ', ',
    // Spanish does not take a comma before the final conjunction.
    lastSeparator: ' y ',
  },
}

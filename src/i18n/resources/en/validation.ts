export const validation = {
  firstName: {
    required: 'First name is required',
    tooLong: 'First name must be at most 50 characters',
    whitespace: 'First name cannot be only whitespace',
  },
  lastName: {
    required: 'Last name is required',
    tooLong: 'Last name must be at most 50 characters',
    whitespace: 'Last name cannot be only whitespace',
  },
  organizationName: {
    required: 'Organization name is required',
    tooLong: 'Organization name must be at most 100 characters',
    whitespace: 'Organization name cannot be only whitespace',
  },
  email: {
    required: 'Email is required',
    invalid: 'Invalid email format',
  },
  password: {
    required: 'Password is required',
    tooShort: 'Password must be at least 8 characters',
    needsUppercase: 'Must contain an uppercase letter',
    needsLowercase: 'Must contain a lowercase letter',
    needsDigit: 'Must contain a digit',
  },
  confirmPassword: {
    required: 'Confirm your password',
    mismatch: 'Passwords do not match',
  },
  /**
   * The live checklist under a new-password field. Each rule is coloured
   * independently as it passes, so the list is assembled from parts — but
   * the joins are translated too, because "a, b, c, and d" is an English
   * habit that Spanish does not share ("a, b, c y d").
   */
  passwordRules: {
    minChars: 'Min. 8 chars',
    uppercase: 'an uppercase',
    lowercase: 'a lowercase',
    digit: 'a digit',
    separator: ', ',
    lastSeparator: ', and ',
  },
}

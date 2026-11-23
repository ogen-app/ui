export const errors = {
  notFound: {
    code: '404',
    title: 'Page not found',
    message: "The page you're looking for doesn't exist or has been moved.",
    type: 'NOT FOUND',
    home: 'Go home',
  },
  serverUnavailable: {
    code: '503',
    title: "Can't reach the server",
    message: "The app can't connect to the server right now.",
    messageSecondLine: 'It may be restarting or temporarily offline.',
    type: 'OFFLINE',
  },
  crash: {
    code: '500',
    title: 'Something went wrong',
    message: 'The app hit an unexpected error. Reloading usually fixes it.',
    type: 'ERROR',
    reload: 'Reload',
  },
}

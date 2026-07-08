// The app's one compact date+time style ("Jul 8, 3:42 PM"), used anywhere a
// timestamp accompanies a post action (scheduled time, version created, …).
export const SHORT_DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

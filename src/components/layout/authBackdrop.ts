/**
 * The photograph behind the auth screens, and the thumbnail that stands in for
 * it while it downloads.
 *
 * The photo is ~570 KB and lives in `public/`, so it is a network round-trip
 * even on a warm cache-miss — long enough for the auth screens to show a bare
 * grey rectangle around the card. `OGENWAVES_LQIP` is the same image at 13×18
 * as a data URI: it costs 1 KB inside the JS bundle, needs no request of its
 * own, and is therefore already painted on the first frame. Blown up to the
 * viewport and blurred it reads as the photograph's colour and light, which is
 * all it has to do for the ~100 ms before the real one fades in over it.
 *
 * It is also the *fallback*: if the photo 404s or the network drops, this is
 * what stays on screen, which is why the auth screens never need a flat colour.
 *
 * To regenerate after changing the photo:
 *
 *   sips -Z 18 -s format jpeg -s formatOptions 55 public/ogenwaves.webp --out /tmp/lqip.jpg
 *   # strip the EXIF/Photoshop segments sips writes — they are ~450 of the bytes
 *   base64 -i /tmp/lqip.jpg
 */
export const OGENWAVES_SRC = '/ogenwaves.webp'

export const OGENWAVES_LQIP =
  'data:image/jpeg;base64,/9j/wAARCAASAA0DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwAEBAQEBAQIBAQICwgICAsPCwsLCw8SDw8PDw8SFhISEhISEhYWFhYWFhYWGxsbGxsbHx8fHx8jIyMjIyMjIyMj/9sAQwEFBgYJCAkPCAgPJBkUGSQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQk/90ABAAB/9oADAMBAAIRAxEAPwDyvUIdA0fTYVuDcyK6YJgwF5xgFiMmvOvFdlJLcxS20b4KYIYZxjoAQK3LHxldSaVDHqGzbCw2sRkDHTAHpXPaxe3V5dG6sFJWQlj5jFuT6AfdHtXoycWtD4+iqkKiclqvuP/Q+VrUlLqeNThT2HSqUjupwpI+lXLb/j9mqjN96u5bI+Yn8Uvkf//Z'

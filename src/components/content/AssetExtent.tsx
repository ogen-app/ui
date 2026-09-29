import { useTranslation } from 'react-i18next'
import { extentLabel } from '@/lib/assetExtent'
import type { Asset } from '@/types/content'

/** `extentLabel`, in the reader's language, for a row that names an asset. */
export function AssetExtent({
  asset,
}: {
  asset: Pick<Asset, 'content' | 'status' | 'type' | 'file'>
}) {
  const { t, i18n } = useTranslation()
  return <>{extentLabel(t, asset, i18n.language)}</>
}

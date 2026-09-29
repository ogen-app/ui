import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { StorageUploadError } from './storageUpload'
import { uploadAudioFile } from './uploads'

const api = vi.hoisted(() => ({
  apiJson: vi.fn(),
  putToStorage: vi.fn(),
  deleteAsset: vi.fn(),
}))

vi.mock('./http', () => ({ apiJson: api.apiJson }))
vi.mock('./content', () => ({ deleteAsset: api.deleteAsset }))
vi.mock('./storageUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./storageUpload')>()),
  putToStorage: api.putToStorage,
}))

const presigned = {
  asset: { id: 'aud1', status: 'pending', type: 'AUDIO' },
  upload_url: 'https://bucket.example/assets/aud1/original.m4a?sig=1',
  storage_key: 'assets/aud1/original.m4a',
  method: 'PUT',
  headers: { 'Content-Type': 'audio/mp4' },
}

const file = new File(['bytes'], 'call.m4a', { type: 'audio/x-m4a' })

beforeEach(() => {
  api.apiJson.mockReset()
  api.putToStorage.mockReset().mockResolvedValue(undefined)
  api.deleteAsset.mockReset().mockResolvedValue(undefined)
})

describe('uploadAudioFile', () => {
  it('presigns, PUTs with the signed headers, then finalizes', async () => {
    const finalized = { ...presigned.asset, status: 'pending' }
    api.apiJson
      .mockResolvedValueOnce(presigned)
      .mockResolvedValueOnce(finalized)

    const result = await uploadAudioFile(file)

    expect(api.apiJson).toHaveBeenNthCalledWith(
      1,
      '/api/content-bank/assets/audio/presign',
      expect.any(String),
      { method: 'POST', body: { filename: 'call.m4a' } },
    )
    // The server's MIME, not the browser's `audio/x-m4a` — the signature
    // covers the Content-Type, and the bucket refuses any other.
    expect(api.putToStorage).toHaveBeenCalledWith(
      presigned.upload_url,
      file,
      expect.objectContaining({ headers: { 'Content-Type': 'audio/mp4' } }),
    )
    expect(api.apiJson).toHaveBeenNthCalledWith(
      2,
      '/api/content-bank/assets/audio/finalize',
      expect.any(String),
      { method: 'POST', body: { asset_id: 'aud1' } },
    )
    expect(result).toEqual({
      filename: 'call.m4a',
      status: 'created',
      asset_id: 'aud1',
      asset: finalized,
    })
    expect(api.deleteAsset).not.toHaveBeenCalled()
  })

  it('words a plan limit at presign as a quota refusal', async () => {
    api.apiJson.mockRejectedValueOnce(new ApiError(402, 'entitlement_exceeded'))
    expect(await uploadAudioFile(file)).toMatchObject({
      status: 'failed',
      code: 'quota_exceeded',
    })
    expect(api.putToStorage).not.toHaveBeenCalled()
  })

  // The asset presign created would otherwise sit `pending` for ever.
  it('deletes the asset again when the storage PUT fails', async () => {
    api.apiJson.mockResolvedValueOnce(presigned)
    api.putToStorage.mockRejectedValueOnce(
      new StorageUploadError('Network error uploading call.m4a'),
    )
    expect(await uploadAudioFile(file)).toMatchObject({
      status: 'failed',
      code: 'storage_upload_failed',
    })
    expect(api.deleteAsset).toHaveBeenCalledWith('aud1')
  })

  it('deletes the asset when finalize refuses it', async () => {
    api.apiJson
      .mockResolvedValueOnce(presigned)
      .mockRejectedValueOnce(
        new ApiError(413, 'audio exceeds the maximum size of 5 GiB'),
      )
    expect(await uploadAudioFile(file)).toEqual({
      filename: 'call.m4a',
      status: 'failed',
      code: 'too_large',
      error: 'audio exceeds the maximum size of 5 GiB',
    })
    expect(api.deleteAsset).toHaveBeenCalledWith('aud1')
  })

  // A finalize that never answered may have started the run.
  it('keeps the asset when finalize never answered', async () => {
    api.apiJson
      .mockResolvedValueOnce(presigned)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(uploadAudioFile(file)).rejects.toThrow('Failed to fetch')
    expect(api.deleteAsset).not.toHaveBeenCalled()
  })
})

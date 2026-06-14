import { AutoRouter, error, IRequest, cors } from 'itty-router'
import { handleAssetDownload, handleAssetUpload, handlePdfUpload, handlePdfDownload } from './assetUploads'

// Export TldrawDurableObject for Cloudflare Durable Objects to find it
export { TldrawDurableObject } from './TldrawDurableObject'

export interface Env {
	TLDRAW_DURABLE_OBJECT: DurableObjectNamespace
	TLDRAW_BUCKET: R2Bucket
}

const { preflight, corsify } = cors()

const router = AutoRouter<IRequest, [env: Env, ctx: ExecutionContext]>({
	before: [preflight],
	finally: [corsify],
	catch: (e) => {
		console.error(e)
		const res = error(e)
		res.headers.set('Access-Control-Allow-Origin', '*')
		return res
	},
})

	// real-time websocket sync endpoint
	.get('/api/connect/:roomId', (request, env) => {
		const id = env.TLDRAW_DURABLE_OBJECT.idFromName(request.params.roomId)
		const room = env.TLDRAW_DURABLE_OBJECT.get(id)
		return room.fetch(request.url, { headers: request.headers, body: request.body })
	})

	// assets upload/download
	.post('/api/uploads/:uploadId', handleAssetUpload)
	.get('/api/uploads/:uploadId', handleAssetDownload)

	// PDF whiteboard export upload/download
	.post('/api/pdf/:sessionId', handlePdfUpload)
	.get('/api/pdf/:sessionId', handlePdfDownload)

	.all('*', () => {
		return new Response('Not found', { status: 404 })
	})

export default {
	fetch: router.fetch,
}

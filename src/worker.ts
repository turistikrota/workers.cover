export interface Env {
	MY_BUCKET: R2Bucket;
}

function objectNotFound(objectName: string): Response {
	return new Response(`<html><body>"<b>${objectName}</b>" not found</body></html>`, {
		status: 404,
		headers: {
			'content-type': 'text/html; charset=UTF-8',
		},
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const objectName = url.pathname.slice(1);
		const bucketPath = 'covers/';

		if (request.method === 'GET' || request.method === 'HEAD') {
			if (request.method === 'GET') {
				let object = await env.MY_BUCKET.get(bucketPath + objectName, {
					range: request.headers,
					onlyIf: request.headers,
				});

				if (object === null) {
					object = await env.MY_BUCKET.get(bucketPath + 'default.png', {
						range: request.headers,
						onlyIf: request.headers,
					});
					if (object === null) {
						return objectNotFound(objectName);
					}
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set('etag', object.httpEtag);
				if (object.range) {
					// @ts-ignore
					headers.set('content-range', `bytes ${object.range.offset}-${object.range.end}/${object.size}`);
				}
				// @ts-ignore
				const status = object.body ? (request.headers.get('range') !== null ? 206 : 200) : 304;
				// @ts-ignore
				return new Response(object.body, {
					headers,
					status,
				});
			}

			let object = await env.MY_BUCKET.head(bucketPath + objectName);

			if (object === null) {
				object = await env.MY_BUCKET.head(bucketPath + 'default.png');
				if (object === null) return objectNotFound(objectName);
			}

			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set('etag', object.httpEtag);
			return new Response(null, {
				headers,
			});
		}
		return new Response(`Unsupported method`, {
			status: 400,
		});
	},
};

import { Headers, Request, Response, fetch } from 'undici'

// Type assertions to handle type mismatches between undici and global types
if (!globalThis.Headers) globalThis.Headers = Headers as typeof globalThis.Headers
if (!globalThis.Request) globalThis.Request = Request as typeof globalThis.Request
if (!globalThis.Response) globalThis.Response = Response as typeof globalThis.Response
if (!globalThis.fetch) globalThis.fetch = fetch as unknown as typeof globalThis.fetch

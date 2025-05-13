import { auth } from '~/server/lib/auth';
// import { toWebRequest } from 'h3'; // Explicitly importing from h3 for clarity

export default defineEventHandler(async (event) => {
  console.log(`[...auth].ts handler invoked for path: ${event.path}`); // Log the path
  // Ensure the handler can be async if auth.handler returns a Promise
  return auth.handler(toWebRequest(event));
}); 
import { getProductOptions } from '~/server/utils/productParser'
import { auth } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const options = await getProductOptions()
    return options
  } catch (error) {
    console.error('Error fetching product options:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch product options'
    })
  }
}) 
import { getProducts } from '~/server/utils/productParser'
import { auth } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const skip = parseInt(query.skip as string) || 0
  const take = parseInt(query.take as string) || 50
  const search = query.search as string
  const orderByColumn = query.orderBy as string || 'createdAt'
  const direction = query.direction as 'asc' | 'desc' || 'desc'
  
  const orderBy = { [orderByColumn]: direction }

  try {
    const result = await getProducts({ skip, take, search, orderBy })
    return {
      data: result.products,
      count: result.total,
      totalPages: Math.ceil(result.total / take),
      currentPage: Math.floor(skip / take) + 1
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch products'
    })
  }
}) 
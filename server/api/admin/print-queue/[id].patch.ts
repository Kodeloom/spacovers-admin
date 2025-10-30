import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const printQueueId = getRouterParam(event, 'id')
  if (!printQueueId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Print queue ID is required'
    })
  }

  const body = await readBody(event)
  
  try {
    const updatedItem = await prisma.printQueue.update({
      where: { id: printQueueId },
      data: {
        isPrinted: body.isPrinted,
        printedAt: body.isPrinted ? new Date() : null,
        printedBy: body.isPrinted ? sessionData.user.id : null
      }
    })

    return {
      success: true,
      data: updatedItem
    }
  } catch (error) {
    console.error('Error updating print queue item:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update print queue item'
    })
  }
})
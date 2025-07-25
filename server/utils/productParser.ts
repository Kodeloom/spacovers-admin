import { PrismaClient } from '@prisma-app/client'

const prisma = new PrismaClient()

export interface ProductSpecs {
  size: string
  shape: string
  pieces: number
  foamThickness: string
  skit: string
  tiedown: string
  color: string
}

export interface ParsedProduct {
  specs: ProductSpecs
  fullDescription: string
  displayName: string
}

/**
 * Parse a product description string into structured specifications
 * Example input: "93X93\nRound\n8\n5\"-2.5\" STEAM STOPPER\n5-FL-SLIT\n6-TD\nBLACK (VINYL)"
 */
export function parseProductDescription(description: string): ParsedProduct | null {
  try {
    const lines = description.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (lines.length < 7) {
      return null // Not enough lines for a complete product description
    }

    const specs: ProductSpecs = {
      size: lines[0] || '',
      shape: lines[1] || '',
      pieces: parseInt(lines[2]) || 0,
      foamThickness: lines[3] || '',
      skit: lines[4] || '',
      tiedown: lines[5] || '',
      color: lines[6] || ''
    }

    // Validate required fields
    if (!specs.size || !specs.shape || specs.pieces === 0 || !specs.foamThickness || !specs.skit || !specs.tiedown || !specs.color) {
      return null
    }

    const fullDescription = lines.join('\n')
    const displayName = `${specs.size} ${specs.shape} ${specs.color}`

    return {
      specs,
      fullDescription,
      displayName
    }
  } catch (error) {
    console.error('Error parsing product description:', error)
    return null
  }
}

/**
 * Find or create a product based on specifications
 */
export async function findOrCreateProduct(specs: ProductSpecs): Promise<{ product: any; created: boolean }> {
  const fullDescription = [
    specs.size,
    specs.shape,
    specs.pieces.toString(),
    specs.foamThickness,
    specs.skit,
    specs.tiedown,
    specs.color
  ].join('\n')

  const displayName = `${specs.size} ${specs.shape} ${specs.color}`

  // Try to find existing product
  let product = await prisma.product.findUnique({
    where: { fullDescription }
  })

  if (product) {
    return { product, created: false }
  }

  // Create new product
  product = await prisma.product.create({
    data: {
      size: specs.size,
      shape: specs.shape,
      pieces: specs.pieces,
      foamThickness: specs.foamThickness,
      skit: specs.skit,
      tiedown: specs.tiedown,
      color: specs.color,
      fullDescription,
      displayName
    }
  })

  return { product, created: true }
}

/**
 * Get all products with pagination and search
 */
export async function getProducts(options: {
  skip?: number
  take?: number
  search?: string
  orderBy?: { [key: string]: 'asc' | 'desc' }
}) {
  const { skip = 0, take = 50, search, orderBy = { createdAt: 'desc' } } = options

  const where = search ? {
    OR: [
      { displayName: { contains: search, mode: 'insensitive' } },
      { fullDescription: { contains: search, mode: 'insensitive' } },
      { size: { contains: search, mode: 'insensitive' } },
      { shape: { contains: search, mode: 'insensitive' } },
      { color: { contains: search, mode: 'insensitive' } }
    ]
  } : {}

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy
    }),
    prisma.product.count({ where })
  ])

  return {
    products,
    total,
    hasMore: skip + take < total
  }
}

/**
 * Get unique values for dropdowns
 */
export async function getProductOptions() {
  const [sizes, shapes, colors, foamThicknesses, skits, tiedowns] = await Promise.all([
    prisma.product.findMany({
      select: { size: true },
      distinct: ['size'],
      orderBy: { size: 'asc' }
    }),
    prisma.product.findMany({
      select: { shape: true },
      distinct: ['shape'],
      orderBy: { shape: 'asc' }
    }),
    prisma.product.findMany({
      select: { color: true },
      distinct: ['color'],
      orderBy: { color: 'asc' }
    }),
    prisma.product.findMany({
      select: { foamThickness: true },
      distinct: ['foamThickness'],
      orderBy: { foamThickness: 'asc' }
    }),
    prisma.product.findMany({
      select: { skit: true },
      distinct: ['skit'],
      orderBy: { skit: 'asc' }
    }),
    prisma.product.findMany({
      select: { tiedown: true },
      distinct: ['tiedown'],
      orderBy: { tiedown: 'asc' }
    })
  ])

  return {
    sizes: sizes.map(p => p.size),
    shapes: shapes.map(p => p.shape),
    colors: colors.map(p => p.color),
    foamThicknesses: foamThicknesses.map(p => p.foamThickness),
    skits: skits.map(p => p.skit),
    tiedowns: tiedowns.map(p => p.tiedown)
  }
} 
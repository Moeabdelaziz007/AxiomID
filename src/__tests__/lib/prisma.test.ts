jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {}
    }),
  }
})

describe('Prisma Client Singleton', () => {
  const originalEnv = process.env
  let globalForPrisma: { prisma?: unknown }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    globalForPrisma = globalThis as unknown as { prisma?: unknown }
    delete globalForPrisma.prisma
  })

  afterAll(() => {
    process.env = originalEnv
    delete globalForPrisma.prisma
  })

  it('should instantiate PrismaClient with correct log levels in development', () => {
    process.env.NODE_ENV = 'development'

    require('../../../src/lib/prisma')
    const { PrismaClient } = require('@prisma/client')

    expect(PrismaClient).toHaveBeenCalledWith({
      datasourceUrl: process.env.DATABASE_URL,
      log: ['warn', 'error'],
    })

    expect(globalForPrisma.prisma).toBeDefined()
  })

  it('should instantiate PrismaClient with correct log levels in production', () => {
    process.env.NODE_ENV = 'production'

    require('../../../src/lib/prisma')
    const { PrismaClient } = require('@prisma/client')

    expect(PrismaClient).toHaveBeenCalledWith({
      datasourceUrl: process.env.DATABASE_URL,
      log: ['error'],
    })

    expect(globalForPrisma.prisma).toBeUndefined()
  })

  it('should reuse existing PrismaClient instance if globalThis.prisma is defined', () => {
    process.env.NODE_ENV = 'development'

    const mockPrisma = { test: true }
    globalForPrisma.prisma = mockPrisma

    const { prisma } = require('../../../src/lib/prisma')
    const { PrismaClient } = require('@prisma/client')

    expect(PrismaClient).not.toHaveBeenCalled()
    expect(prisma).toBe(mockPrisma)
  })
})

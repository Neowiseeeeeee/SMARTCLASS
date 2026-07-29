import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  datasourceUrl: env('DATABASE_URL'),
})

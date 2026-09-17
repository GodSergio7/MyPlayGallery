import { z } from 'zod'

export const RawgPlatformSchema = z.object({
  id: z.number().int(),
  name: z.string(),
})

export const RawgGamePlatformSchema = z.object({
  platform: RawgPlatformSchema,
})

export const RawgGenreSchema = z.object({
  name: z.string(),
})

export const RawgGameSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  released: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  background_image: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  genres: z
    .array(RawgGenreSchema)
    .nullish()
    .transform((value) => value ?? []),
  platforms: z
    .array(RawgGamePlatformSchema)
    .nullish()
    .transform((value) => value ?? []),
})

export const RawgGameListResponseSchema = z.object({
  results: z.array(RawgGameSchema),
})

export type RawgGenre = z.infer<typeof RawgGenreSchema>
export type RawgPlatform = z.infer<typeof RawgPlatformSchema>
export type RawgGamePlatform = z.infer<typeof RawgGamePlatformSchema>
export type RawgGame = z.infer<typeof RawgGameSchema>
export type RawgGameListResponse = z.infer<typeof RawgGameListResponseSchema>

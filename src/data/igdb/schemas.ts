import { z } from 'zod'

export const IgdbCoverSchema = z.object({
  url: z.string(),
})

export const IgdbGenreSchema = z.object({
  name: z.string(),
})

export const IgdbPlatformSchema = z.object({
  id: z.number().int(),
  name: z.string(),
})

export const IgdbGameSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  first_release_date: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  cover: IgdbCoverSchema.nullish().transform((value) => value ?? null),
  genres: z
    .array(IgdbGenreSchema)
    .nullish()
    .transform((value) => value ?? []),
  platforms: z
    .array(IgdbPlatformSchema)
    .nullish()
    .transform((value) => value ?? []),
})

export const IgdbGameListResponseSchema = z.object({
  results: z.array(IgdbGameSchema),
})

export type IgdbCover = z.infer<typeof IgdbCoverSchema>
export type IgdbGenre = z.infer<typeof IgdbGenreSchema>
export type IgdbPlatform = z.infer<typeof IgdbPlatformSchema>
export type IgdbGame = z.infer<typeof IgdbGameSchema>
export type IgdbGameListResponse = z.infer<typeof IgdbGameListResponseSchema>

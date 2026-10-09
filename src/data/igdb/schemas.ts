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
  total_rating: z
    .number()
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

export const IgdbBrowseResponseSchema = z.object({
  results: z.array(IgdbGameSchema),
  has_more: z.boolean(),
  total: z.number().int().nullable(),
})

const nullableNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? null)
const nullableString = z
  .string()
  .nullish()
  .transform((value) => value ?? null)
const NamedSchema = z.object({ id: z.number().int(), name: z.string() })

export const IgdbFullGameSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  summary: nullableString,
  storyline: nullableString,
  first_release_date: nullableNumber,
  total_rating: nullableNumber,
  total_rating_count: nullableNumber,
  aggregated_rating: nullableNumber,
  aggregated_rating_count: nullableNumber,
  rating: nullableNumber,
  rating_count: nullableNumber,
  cover: IgdbCoverSchema.nullish().transform((value) => value ?? null),
  screenshots: z.array(z.object({ url: z.string() })),
  artworks: z.array(z.object({ url: z.string() })),
  videos: z.array(z.object({ video_id: z.string(), name: z.string() })),
  genres: z.array(NamedSchema),
  themes: z.array(NamedSchema),
  game_modes: z.array(NamedSchema),
  player_perspectives: z.array(NamedSchema),
  platforms: z.array(NamedSchema),
  developers: z.array(z.string()),
  publishers: z.array(z.string()),
  franchises: z.array(z.string()),
  engines: z.array(z.string()),
  similar_games: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      cover: IgdbCoverSchema.nullish().transform((value) => value ?? null),
      total_rating: nullableNumber,
      first_release_date: nullableNumber,
    }),
  ),
  websites: z.array(z.object({ url: z.string(), type: nullableNumber })),
  pegi: nullableString,
  release_dates: z.array(z.object({ platform: z.string(), date: z.number() })),
  time_to_beat: z
    .object({
      hastily: nullableNumber,
      normally: nullableNumber,
      completely: nullableNumber,
      count: nullableNumber,
    })
    .nullable(),
})

export type IgdbFullGame = z.infer<typeof IgdbFullGameSchema>
export type IgdbCover = z.infer<typeof IgdbCoverSchema>
export type IgdbGenre = z.infer<typeof IgdbGenreSchema>
export type IgdbPlatform = z.infer<typeof IgdbPlatformSchema>
export type IgdbGame = z.infer<typeof IgdbGameSchema>
export type IgdbGameListResponse = z.infer<typeof IgdbGameListResponseSchema>
export type IgdbBrowseResponse = z.infer<typeof IgdbBrowseResponseSchema>

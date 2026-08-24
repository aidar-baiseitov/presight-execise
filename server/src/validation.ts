import { z } from "zod";
import { SORT_FIELDS, SORT_ORDERS, type UserFilters, type UserListQuery } from "./types.js";

const MAX_SELECTED_VALUES = 50;

/** `?hobby=Chess&hobby=Yoga` (repeated) — also tolerates a single value. */
const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [];
    const list = Array.isArray(value) ? value : [value];
    const cleaned = list.map((item) => item.trim()).filter((item) => item.length > 0);
    return [...new Set(cleaned)];
  })
  .pipe(z.array(z.string().max(100)).max(MAX_SELECTED_VALUES));

const filtersSchema = z.object({
  q: z.string().max(100).optional().transform((value) => value?.trim() ?? ""),
  nationality: stringList,
  hobby: stringList,
});

const listSchema = filtersSchema.extend({
  sort: z.enum(SORT_FIELDS).default("first_name"),
  order: z.enum(SORT_ORDERS).default("asc"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export class ValidationError extends Error {
  readonly status = 400;
  readonly code = "INVALID_QUERY";
  readonly details: Array<{ field: string; message: string }>;

  constructor(issues: z.ZodIssue[]) {
    const details = issues.map((issue) => ({
      field: issue.path.join(".") || "query",
      message: issue.message,
    }));
    super(details.map((detail) => `${detail.field}: ${detail.message}`).join("; "));
    this.name = "ValidationError";
    this.details = details;
  }
}

export function parseFilters(query: unknown): UserFilters {
  const result = filtersSchema.safeParse(query);
  if (!result.success) throw new ValidationError(result.error.issues);
  const { q, nationality, hobby } = result.data;
  return { q, nationalities: nationality, hobbies: hobby };
}

export function parseListQuery(query: unknown): UserListQuery {
  const result = listSchema.safeParse(query);
  if (!result.success) throw new ValidationError(result.error.issues);
  const { q, nationality, hobby, sort, order, page, pageSize } = result.data;
  return { q, nationalities: nationality, hobbies: hobby, sort, order, page, pageSize };
}

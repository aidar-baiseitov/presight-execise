/** Mirrors the server contract (`server/src/types.ts`). Field names match the API payload. */

export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  first_name: "First name",
  last_name: "Last name",
  age: "Age",
  nationality: "Nationality",
};

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserListResponse {
  data: User[];
  meta: PaginationMeta;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FacetsResponse {
  hobbies: FacetValue[];
  nationalities: FacetValue[];
}

/** Filters that affect both the list and the sidebar facets. */
export interface Filters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface DirectoryState extends Filters {
  sort: SortField;
  order: SortOrder;
}

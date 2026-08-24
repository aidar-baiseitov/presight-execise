export const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Filters shared by the list, the count and both facet queries. */
export interface UserFilters {
  q: string;
  nationalities: string[];
  hobbies: string[];
}

export interface UserListQuery extends UserFilters {
  sort: SortField;
  order: SortOrder;
  page: number;
  pageSize: number;
}

export interface UserDto {
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
  data: UserDto[];
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

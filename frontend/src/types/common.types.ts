export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface UserBasic {
  id: string;
  fullName: string;
  email: string;
  profilePhoto?: string | null;
}

export interface ProjectBasic {
  id: string;
  name: string;
  code: string;
}

export interface CategoryBasic {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PartnerBasic {
  id: string;
  code: string;
  name: string;
}

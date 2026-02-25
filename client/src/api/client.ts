import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE = '/api';
const AUTH_BASE = '/dj-rest-auth';

export function getCsrfToken(): string | null {
  const name = 'csrftoken';
  if (document.cookie) {
    for (const cookie of document.cookie.split(';')) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) return decodeURIComponent(value);
    }
  }
  return null;
}

function addCsrfHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = getCsrfToken();
  if (token) {
    const h = config.headers as Record<string, string>;
    if (h) h['X-CSRFToken'] = token;
  }
  return config;
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
api.interceptors.request.use(addCsrfHeader);

const authApi = axios.create({
  baseURL: AUTH_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
authApi.interceptors.request.use(addCsrfHeader);

export { api, authApi };

export interface Address {
  id: number;
  street_name: string;
  house_number: string;
  latitude: number;
  longitude: number;
  display_address: string;
  geometry?: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

export interface PendingInvite {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  photo_url: string | null;
}

export interface AddressWithUsers extends Address {
  users: User[];
  invites: PendingInvite[];
  user_lives_here?: boolean;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  photo: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  address: Address | null;
  is_staff?: boolean;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  address_id?: number | null;
}

export interface BAGBuilding {
  street_name: string;
  house_number: string;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
  bag_id?: string;
}

export const addressesApi = {
  list: () => api.get<AddressWithUsers[]>('/addresses/'),
  get: (id: number) => api.get<AddressWithUsers>(`/addresses/${id}/`),
  bulkCreate: (data: BAGBuilding[]) =>
    api.post<Address[]>('/addresses/bulk_create/', data),
};

export const bagApi = {
  getBuildings: (bbox: string, crs?: string) =>
    api.get<{ features: BAGBuilding[] }>('/bag/buildings/', {
      params: { bbox, crs: crs || 'wgs84' },
    }),
};

export const usersApi = {
  list: () => api.get<User[]>('/users/'),
  get: (id: number) => api.get<User>(`/users/${id}/`),
  update: (id: number, data: UserUpdate) =>
    api.patch<User>(`/users/${id}/`, data),
};

export interface Invite {
  id: number;
  code: string;
  address: Address;
  created_at: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  photo: string | null;
  photo_url: string | null;
}

export interface InviteCreateData {
  address_id?: number;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  photo?: File;
}

export interface InviteUpdateData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  photo?: File | null;
}

export const invitesApi = {
  list: () => api.get<Invite[]>('/invites/'),
  get: (id: number) => api.get<Invite>(`/invites/${id}/`),
  create: (data: InviteCreateData) => {
    const hasFile = data.photo instanceof File;
    if (hasFile) {
      const formData = new FormData();
      if (data.address_id != null) formData.append('address_id', String(data.address_id));
      if (data.first_name) formData.append('first_name', data.first_name);
      if (data.last_name) formData.append('last_name', data.last_name);
      if (data.date_of_birth) formData.append('date_of_birth', data.date_of_birth);
      formData.append('photo', data.photo!);
      return api.post<Invite>('/invites/', formData);
    }
    return api.post<Invite>('/invites/', data);
  },
  update: (id: number, data: InviteUpdateData) => {
    if (data.photo instanceof File) {
      const formData = new FormData();
      if (data.first_name !== undefined) formData.append('first_name', data.first_name);
      if (data.last_name !== undefined) formData.append('last_name', data.last_name);
      if (data.date_of_birth !== undefined) formData.append('date_of_birth', data.date_of_birth ?? '');
      formData.append('photo', data.photo);
      return api.patch<Invite>(`/invites/${id}/`, formData);
    }
    return api.patch<Invite>(`/invites/${id}/`, data);
  },
  delete: (id: number) => api.delete(`/invites/${id}/`),
  validate: (code: string) =>
    api.get<{
      valid: boolean;
      address: Address;
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
    }>(`/invites/${code}/validate/`),
  register: (code: string, data: InviteRegisterData) =>
    api.post<{ user: User; access: string; refresh: string }>(
      `/invites/${code}/register/`,
      data
    ),
};

export interface InviteRegisterData {
  email: string;
  password1: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
}

export const auth = {
  login: (email: string, password: string) =>
    authApi.post('/login/', { email, password }),
  logout: () => authApi.post('/logout/'),
  user: () => authApi.get<User>('/user/'),
  google: (code: string) => authApi.post('/google/', { code }),
  twitter: (accessToken: string, tokenSecret: string) =>
    authApi.post('/twitter/', { access_token: accessToken, token_secret: tokenSecret }),
  github: (code: string) => authApi.post('/github/', { code }),
  facebook: (accessToken: string) => authApi.post('/facebook/', { access_token: accessToken }),
};

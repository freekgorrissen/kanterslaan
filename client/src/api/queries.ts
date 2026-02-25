import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  addressesApi,
  invitesApi,
  usersApi,
  bagApi,
  type AddressWithUsers,
  type Invite,
  type User,
  type InviteCreateData,
  type InviteUpdateData,
  type UserUpdate,
  type BAGBuilding,
} from './client';

export const queryKeys = {
  bag: {
    buildings: (bbox: string) => ['bag', 'buildings', bbox] as const,
  },
  addresses: {
    all: ['addresses'] as const,
    list: () => [...queryKeys.addresses.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.addresses.all, id] as const,
  },
  invites: {
    all: ['invites'] as const,
    list: () => [...queryKeys.invites.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.invites.all, id] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: number) => [...queryKeys.users.all, id] as const,
  },
};

export function useBAGBuildings(
  bbox: string | null,
  options?: Omit<
    UseQueryOptions<BAGBuilding[]>,
    'queryKey' | 'queryFn'
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.bag.buildings(bbox ?? ''),
    queryFn: async () => {
      const { data } = await bagApi.getBuildings(bbox!);
      return data.features ?? [];
    },
    enabled: bbox != null && bbox.length > 0,
    ...options,
  });
}

export function useAddressesList(
  options?: Omit<UseQueryOptions<AddressWithUsers[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.addresses.list(),
    queryFn: async () => {
      const { data } = await addressesApi.list();
      return data;
    },
    ...options,
  });
}

export function useAddressDetail(
  id: number | null,
  options?: Omit<
    UseQueryOptions<AddressWithUsers>,
    'queryKey' | 'queryFn'
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.addresses.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await addressesApi.get(id!);
      return data;
    },
    enabled: id != null,
    ...options,
  });
}

export function useInvitesList(
  options?: Omit<UseQueryOptions<Invite[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.invites.list(),
    queryFn: async () => {
      const { data } = await invitesApi.list();
      return data;
    },
    ...options,
  });
}

export function useInviteDetail(
  id: number | null,
  options?: Omit<
    UseQueryOptions<Invite>,
    'queryKey' | 'queryFn'
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.invites.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await invitesApi.get(id!);
      return data;
    },
    enabled: id != null,
    ...options,
  });
}

export function useUserDetail(
  id: number | null,
  options?: Omit<
    UseQueryOptions<User>,
    'queryKey' | 'queryFn'
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await usersApi.get(id!);
      return data;
    },
    enabled: id != null,
    ...options,
  });
}

export function useCreateInvite(
  options?: UseMutationOptions<Invite, Error, InviteCreateData>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InviteCreateData) => {
      const { data: invite } = await invitesApi.create(data);
      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
    ...options,
  });
}

export function useUpdateInvite(
  options?: UseMutationOptions<Invite, Error, { id: number; data: InviteUpdateData }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InviteUpdateData }) => {
      const { data: invite } = await invitesApi.update(id, data);
      return invite;
    },
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.detail(invite.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
    ...options,
  });
}

export function useDeleteInvite(
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await invitesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
    ...options,
  });
}

export function useUpdateUser(
  options?: UseMutationOptions<User, Error, { id: number; data: UserUpdate }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserUpdate }) => {
      const { data: user } = await usersApi.update(id, data);
      return user;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.id) });
    },
    ...options,
  });
}

export function useBulkCreateAddresses(
  options?: UseMutationOptions<unknown, Error, BAGBuilding[]>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BAGBuilding[]) => {
      await addressesApi.bulkCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses.all });
    },
    ...options,
  });
}

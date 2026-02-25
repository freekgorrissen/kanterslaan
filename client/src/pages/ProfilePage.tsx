import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useUserDetail, useAddressesList, useUpdateUser, queryKeys } from '../api/queries';
import { useQueryClient } from '@tanstack/react-query';
import { getCsrfToken } from '../api/client';

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [addressId, setAddressId] = useState<number | string>('');
  const [message, setMessage] = useState('');

  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useUserDetail(authUser?.id ?? null);
  const { data: addresses = [] } = useAddressesList();

  useEffect(() => {
    if (user) setAddressId(user.address?.id ?? '');
  }, [user]);

  const { t } = useTranslation();
  const updateMutation = useUpdateUser({
    onSuccess: () => {
      refreshUser();
      setMessage(t('profile.updated'));
    },
    onError: () => setMessage(t('profile.failed')),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setMessage('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    const first_name = (formData.get('first_name') as string) || '';
    const last_name = (formData.get('last_name') as string) || '';
    const date_of_birth = (formData.get('date_of_birth') as string) || '';
    const photo = formData.get('photo') as File;
    const hasPhoto = photo && photo.size > 0;

    if (hasPhoto) {
      const fd = new FormData();
      fd.append('first_name', first_name);
      fd.append('last_name', last_name);
      fd.append('date_of_birth', date_of_birth);
      if (authUser?.is_staff && addressId !== '') fd.append('address_id', String(addressId));
      fd.append('photo', photo);
      const token = getCsrfToken();
      const headers: Record<string, string> = {};
      if (token) headers['X-CSRFToken'] = token;
      try {
        const res = await fetch(`/api/users/${user.id}/`, {
          method: 'PATCH',
          body: fd,
          credentials: 'include',
          headers,
        });
        if (!res.ok) throw new Error('Update failed');
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(user.id) });
        await refreshUser();
        setMessage(t('profile.updated'));
      } catch {
        setMessage(t('profile.failed'));
      }
    } else {
      updateMutation.mutate({
        id: user.id,
        data: {
          first_name: first_name || undefined,
          last_name: last_name || undefined,
          date_of_birth: date_of_birth || undefined,
          ...(authUser?.is_staff
            ? { address_id: addressId !== '' ? Number(addressId) : null }
            : {}),
        },
      });
    }
  };

  if (userLoading || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', p: 3 }}>
      <Typography variant="h1" gutterBottom>
        {t('profile.title')}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            name="first_name"
            label={t('profile.firstName')}
            defaultValue={user.first_name}
            sx={{ mb: 2 }}
            fullWidth
          />
          <TextField
            name="last_name"
            label={t('profile.lastName')}
            defaultValue={user.last_name}
            sx={{ mb: 2 }}
            fullWidth
          />
          <TextField
            name="date_of_birth"
            label={t('profile.dateOfBirth')}
            type="date"
            defaultValue={user.date_of_birth || ''}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
            fullWidth
          />
          <Box sx={{ mb: 2 }}>
            {user.photo_url && (
              <Avatar
                src={user.photo_url}
                alt=""
                sx={{ width: 80, height: 80, mb: 1 }}
              />
            )}
            <Button variant="outlined" component="label" fullWidth>
              {t('profile.uploadPhoto')}
              <input name="photo" type="file" accept="image/*" hidden />
            </Button>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }} disabled={!authUser?.is_staff}>
            <InputLabel>{t('profile.address')}</InputLabel>
            <Select
              label={t('profile.address')}
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
            >
              <MenuItem value="">{t('common.none')}</MenuItem>
              {addresses.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.display_address}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {message && (
            <Alert
              severity={message.includes('Failed') ? 'error' : 'success'}
              sx={{ mb: 2 }}
            >
              {message}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TextField,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useAddressesList, useCreateInvite } from '../api/queries';
import type { Invite, InviteCreateData } from '../api/client';

export interface InviteFormProps {
  /** Pre-select this address when provided (e.g. when opened from MapPage) */
  initialAddressId?: number;
  /** Called when invite is created successfully */
  onSuccess?: (invite: Invite) => void;
}

export default function InviteForm({ initialAddressId, onSuccess }: InviteFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: addresses = [] } = useAddressesList({ enabled: user?.is_staff ?? false });
  const [addressId, setAddressId] = useState<number | ''>('');
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [date_of_birth, setDateOfBirth] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState<
    | { type: 'success'; text: string; inviteCode?: string }
    | { type: 'error'; text: string }
    | null
  >(null);

  const createMutation = useCreateInvite({
    onSuccess: (invite) => {
      setMessage({
        type: 'success',
        text: t('invites.inviteCreated', { url: `${window.location.origin}/invite/${invite.code}` }),
        inviteCode: invite.code,
      });
      setPhoto(null);
      onSuccess?.(invite);
    },
    onError: (err: unknown) => {
      const res =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: Record<string, string[]> | string } }).response?.data
          : null;
      const msg =
        res && typeof res === 'object'
          ? (Object.values(res).flat().find(Boolean) as string) || t('invites.failedToCreate')
          : typeof res === 'string'
            ? res
            : t('invites.failedToCreate');
      setMessage({ type: 'error', text: msg });
    },
  });

  useEffect(() => {
    if (initialAddressId != null) {
      setAddressId(initialAddressId);
    }
  }, [initialAddressId]);

  const handleCreate = () => {
    setMessage(null);
    const data: InviteCreateData =
      user?.is_staff && addressId ? { address_id: addressId } : {};
    if (first_name.trim()) data.first_name = first_name.trim();
    if (last_name.trim()) data.last_name = last_name.trim();
    if (date_of_birth) data.date_of_birth = date_of_birth;
    if (photo) data.photo = photo;
    createMutation.mutate(data);
  };

  const canCreate = user?.is_staff ? !!addressId : !!user?.address;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {user?.is_staff
          ? t('invites.inviteFormStaffHint')
          : t('invites.inviteFormUserHint')}
      </Typography>
      {user?.is_staff ? (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>{t('profile.address')}</InputLabel>
          <Select
            label={t('profile.address')}
            value={addressId}
            onChange={(e) => setAddressId(e.target.value as number)}
          >
            <MenuItem value="">{t('common.select')}</MenuItem>
            {addresses.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.display_address}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : !user?.address ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('invites.needAddress')}
        </Alert>
      ) : null}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        {t('invites.optionalFieldsHint')}
      </Typography>
      <TextField
        label={t('inviteSignup.firstName')}
        value={first_name}
        onChange={(e) => setFirstName(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 1 }}
      />
      <TextField
        label={t('inviteSignup.lastName')}
        value={last_name}
        onChange={(e) => setLastName(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 1 }}
      />
      <TextField
        label={t('inviteSignup.dateOfBirth')}
        type="date"
        value={date_of_birth}
        onChange={(e) => setDateOfBirth(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
        size="small"
        sx={{ mb: 1 }}
      />
      <Button
        variant="outlined"
        component="label"
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        {photo ? photo.name : t('invites.addPhoto')}
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </Button>
      <Button
        variant="contained"
        onClick={handleCreate}
        disabled={!canCreate || createMutation.isPending}
      >
        {createMutation.isPending ? t('common.creating') : t('invites.createInvite')}
      </Button>
      {message && (
        <Alert
          severity={message.type}
          sx={{ mt: 2 }}
          onClose={() => setMessage(null)}
          action={
            message.type === 'success' && message.inviteCode ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${message.inviteCode}`
                  );
                }}
              >
                {t('invites.copyLink')}
              </Button>
            ) : undefined
          }
        >
          {message.text}
        </Alert>
      )}
    </Paper>
  );
}

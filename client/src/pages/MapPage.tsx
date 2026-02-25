import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Drawer,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  useColorScheme,
} from '@mui/material';
import { theme } from '../theme';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useAddressesList, useAddressDetail } from '../api/queries';
import { useAuth } from '../contexts/AuthContext';
import InviteForm from '../components/InviteForm';
import InviteEditDialog from '../components/InviteEditDialog';
import type { AddressWithUsers, User, PendingInvite } from '../api/client';
import type { FeatureCollection } from 'geojson';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const yellowStarIcon = L.divIcon({
  html: '<span style="font-size:24px;color:#ffd700;text-shadow:0 0 2px #333">★</span>',
  className: 'custom-star-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const HEADER_HEIGHT = 64;

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_MATTER_TILES = 'https://api.maptiler.com/maps/darkmatter/{z}/{x}/{y}.png';
const CARTO_DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

function MapClickHandler({
  drawerOpen,
  onMapClick,
}: {
  drawerOpen: boolean;
  onMapClick: () => void;
}) {
  useMapEvents({
    click: () => {
      if (drawerOpen) onMapClick();
    },
  });
  return null;
}

export default function MapPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { mode } = useColorScheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  const maptilerKey = import.meta.env.VITE_MAPTILER_KEY;
  const tileUrl =
    mode === 'dark'
      ? maptilerKey
        ? `${DARK_MATTER_TILES}?key=${maptilerKey}`
        : CARTO_DARK_TILES
      : OSM_TILES;
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editInviteId, setEditInviteId] = useState<number | null>(null);

  const { data: addresses = [], isLoading: addressesLoading } = useAddressesList();
  const { data: selectedAddress } = useAddressDetail(
    selectedAddressId,
    { enabled: selectedAddressId != null }
  );

  const handleMarkerClick = (addr: AddressWithUsers) => {
    setSelectedAddressId(addr.id);
  };

  const handleCloseDrawer = () => {
    setSelectedAddressId(null);
  };

  const loading = addressesLoading;

  const defaultCenter: [number, number] = [51.753557, 5.747465];
  const defaultZoom = 19;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="40vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 64px)' }}>
      <Box sx={{ width: '100%', height: '100%' }}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <MapClickHandler
            drawerOpen={!!selectedAddress}
            onMapClick={handleCloseDrawer}
          />
          <TileLayer
            key={tileUrl}
            attribution={
              mode === 'dark' && maptilerKey
                ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                : mode === 'dark'
                  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }
            url={tileUrl}
            maxZoom={20}
            maxNativeZoom={20}
            {...(mode === 'dark' &&
              maptilerKey && {
                tileSize: 512,
                zoomOffset: -1,
              })}
          />
          <GeoJSON
            key={addresses.map((a) => a.id).join(',')}
            data={
              {
                type: 'FeatureCollection',
                features: addresses
                  .filter((a) => a.geometry)
                  .map((addr) => ({
                    type: 'Feature' as const,
                    properties: { address: addr },
                    geometry: addr.geometry!,
                  })),
              } as FeatureCollection
            }
            style={(feature) => {
              const addr = feature?.properties?.address as AddressWithUsers | undefined;
              const isSelected = addr && selectedAddress?.id === addr.id;
              return {
                color: isSelected ? '#2e7d32' : '#1976d2',
                weight: 2,
                fillColor: isSelected ? '#2e7d32' : '#1976d2',
                fillOpacity: 0.2,
              };
            }}
            onEachFeature={(feature, layer) => {
              const addr = feature?.properties?.address as AddressWithUsers | undefined;
              if (!addr) return;
              const userNames = (addr.users ?? []).map((u) =>
                u.first_name || u.last_name
                  ? `${u.first_name} ${u.last_name}`.trim()
                  : u.email
              );
              const inviteNames = (addr.invites ?? []).map(
                (i) =>
                  (i.first_name || i.last_name
                    ? `${i.first_name} ${i.last_name}`.trim()
                    : t('map.pendingInvite')) as string
              );
              const residentNames =
                [...userNames, ...inviteNames].length > 0
                  ? [...userNames, ...inviteNames].join(', ')
                  : t('map.noResidents');
              layer.bindTooltip(
                `${addr.display_address}<br/><span style="font-size:11px;color:#666">${residentNames}</span>`,
                {
                  permanent: false,
                  direction: 'top',
                }
              );
              // layer.bindPopup(
              //   `<strong>${addr.display_address}</strong><br/><span style="color:#666;font-size:12px">Click to see residents</span>`
              // );
              layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                handleMarkerClick(addr);
              });
            }}
          />
          {addresses
            .filter((a) => a.user_lives_here && a.latitude != null && a.longitude != null)
            .map((addr) => (
              <Marker
                key={`star-${addr.id}`}
                position={[addr.latitude!, addr.longitude!]}
                icon={yellowStarIcon}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    handleMarkerClick(addr);
                  },
                }}
              >
                <Tooltip permanent={false} direction="top">
                  {t('map.yourHome')}
                </Tooltip>
              </Marker>
            ))}
        </MapContainer>
      </Box>
      <Drawer
        variant="persistent"
        anchor={isNarrow ? 'bottom' : 'right'}
        open={!!selectedAddress}
        onClose={handleCloseDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            zIndex: 2400,
            display: 'flex',
            flexDirection: 'column',
            ...(isNarrow
              ? {
                  top: 'auto',
                  left: 0,
                  right: 0,
                  maxHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
                }
              : {
                  width: 320,
                  top: HEADER_HEIGHT,
                  height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                }),
          },
        }}
      >
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain' }}>
          {selectedAddress && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                  {selectedAddress.display_address}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCloseDrawer}
                  aria-label={t('common.close')}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              {selectedAddress.users.length > 0 || (selectedAddress.invites?.length ?? 0) > 0 ? (
                <List dense disablePadding>
                  {selectedAddress.users.map((u: User) => {
                    const initials =
                      ((u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase() ||
                      u.email.slice(0, 2).toUpperCase();
                    return (
                      <ListItem key={`user-${u.id}`} disablePadding sx={{ py: 0.5 }}>
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar
                            src={u.photo_url ?? undefined}
                            sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                          >
                            {initials}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            u.first_name || u.last_name
                              ? `${u.first_name} ${u.last_name}`.trim()
                              : u.email
                          }
                          secondary={u.email}
                        />
                      </ListItem>
                    );
                  })}
                  {(selectedAddress.invites ?? []).map((inv: PendingInvite) => {
                    const initials =
                      ((inv.first_name?.[0] ?? '') + (inv.last_name?.[0] ?? '')).toUpperCase() || '?';
                    const displayName =
                      inv.first_name || inv.last_name
                        ? `${inv.first_name} ${inv.last_name}`.trim()
                        : t('map.pendingInvite');
                    return (
                      <ListItem
                        key={`invite-${inv.id}`}
                        disablePadding
                        sx={{ py: 0.5 }}
                        secondaryAction={
                          (user?.is_staff || user?.address?.id === selectedAddress.id) && (
                            <IconButton
                              size="small"
                              onClick={() => setEditInviteId(inv.id)}
                              aria-label={t('invites.editInviteAria')}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )
                        }
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar
                            src={inv.photo_url ?? undefined}
                            sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                          >
                            {initials}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={displayName}
                          secondary={t('map.invitePending')}
                          secondaryTypographyProps={{ sx: { fontStyle: 'italic' } }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('map.noUsersAtAddress')}
                </Typography>
              )}
              {(user?.is_staff || user?.address?.id === selectedAddress.id) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setInviteDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  {t('map.addResident')}
                </Button>
              )}
            </>
          )}
        </Box>
      </Drawer>
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('map.createInvite')}</DialogTitle>
        <DialogContent>
          <InviteForm
            initialAddressId={selectedAddress?.id}
            onSuccess={() => {
              setInviteDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <InviteEditDialog
        inviteId={editInviteId}
        open={!!editInviteId}
        onClose={() => setEditInviteId(null)}
        onSuccess={() => {}}
      />
    </Box>
  );
}

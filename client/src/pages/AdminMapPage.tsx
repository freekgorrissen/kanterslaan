import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Rectangle,
  GeoJSON,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  CircularProgress,
  Alert,
  useColorScheme,
} from '@mui/material';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { useBAGBuildings, useBulkCreateAddresses } from '../api/queries';

const DEFAULT_CENTER: [number, number] = [51.753557, 5.747465];
const DEFAULT_ZOOM = 19;

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_MATTER_TILES = 'https://api.maptiler.com/maps/darkmatter/{z}/{x}/{y}.png';
const CARTO_DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

function DrawRectangleHandler({
  onBbox,
  enabled,
}: {
  onBbox: (minLat: number, minLon: number, maxLat: number, maxLon: number) => void;
  enabled: boolean;
}) {
  const [corners, setCorners] = useState<[[number, number], [number, number]] | null>(null);

  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      const { lat, lng } = e.latlng;
      setCorners((prev) => {
        if (!prev) return [[lat, lng], [lat, lng]];
        const [[lat1, lon1]] = prev;
        const minLat = Math.min(lat1, lat);
        const maxLat = Math.max(lat1, lat);
        const minLon = Math.min(lon1, lng);
        const maxLon = Math.max(lon1, lng);
        onBbox(minLat, minLon, maxLat, maxLon);
        return null;
      });
    },
  });

  useEffect(() => {
    if (!enabled) setCorners(null);
  }, [enabled]);

  if (!corners) return null;
  const [[lat1, lon1], [lat2, lon2]] = corners;
  const bounds: L.LatLngBoundsExpression = [
    [Math.min(lat1, lat2), Math.min(lon1, lon2)],
    [Math.max(lat1, lat2), Math.max(lon1, lon2)],
  ];
  return <Rectangle bounds={bounds} pathOptions={{ color: '#ff0000', weight: 2 }} />;
}

function BuildingLayer({
  feature,
  isHighlighted,
  isSelected,
}: {
  feature: Feature<Polygon | MultiPolygon>;
  isHighlighted: boolean;
  isSelected: boolean;
}) {
  const style = {
    color: isSelected ? '#2e7d32' : isHighlighted ? '#f9a825' : '#1976d2',
    weight: isSelected ? 3 : isHighlighted ? 3 : 2,
    fillOpacity: isSelected ? 0.3 : isHighlighted ? 0.2 : 0.1,
  };

  return (
    <GeoJSON
      key={feature.properties?.bag_id || JSON.stringify(feature)}
      data={feature}
      style={style}
    />
  );
}

export default function AdminMapPage() {
  const { mode } = useColorScheme();
  const maptilerKey = import.meta.env.VITE_MAPTILER_KEY;
  const tileUrl =
    mode === 'dark'
      ? maptilerKey
        ? `${DARK_MATTER_TILES}?key=${maptilerKey}`
        : CARTO_DARK_TILES
      : OSM_TILES;
  const [drawMode, setDrawMode] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hovered, setHovered] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: buildings = [], isLoading: loading } = useBAGBuildings(bbox);
  const { t } = useTranslation();
  const bulkCreateMutation = useBulkCreateAddresses({
    onSuccess: (_, variables) => {
      setMessage({ type: 'success', text: t('adminMap.createdAddresses', { count: variables.length }) });
      setBbox(null);
      setSelected(new Set());
    },
    onError: () => setMessage({ type: 'error', text: t('adminMap.failedToCreate') }),
  });

  const handleBbox = useCallback(
    (minLat: number, minLon: number, maxLat: number, maxLon: number) => {
      setDrawMode(false);
      setBbox(`${minLon},${minLat},${maxLon},${maxLat}`);
    },
    []
  );

  const handleSubmit = () => {
    const toCreate = buildings.filter((_, i) => selected.has(i));
    if (toCreate.length === 0) {
      setMessage({ type: 'error', text: t('adminMap.selectAtLeastOne') });
      return;
    }
    setMessage(null);
    bulkCreateMutation.mutate(toCreate);
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const geoJsonFeatures = buildings.map((b, i) => ({
    type: 'Feature' as const,
    id: i,
    properties: { ...b, bag_id: b.bag_id || `bag-${i}` },
    geometry: b.geometry,
  })) as Feature<Polygon | MultiPolygon>[];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
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
            maxZoom={19}
            maxNativeZoom={19}
            {...(mode === 'dark' &&
              maptilerKey && {
                tileSize: 512,
                zoomOffset: -1,
              })}
          />
          <DrawRectangleHandler onBbox={handleBbox} enabled={drawMode} />
          {geoJsonFeatures.map((f, i) => (
            <BuildingLayer
              key={i}
              feature={f}
              isHighlighted={hovered === i}
              isSelected={selected.has(i)}
            />
          ))}
        </MapContainer>
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1000 }}>
          <Button
            variant="contained"
            onClick={() => setDrawMode(true)}
            disabled={loading}
            sx={{ mb: 1 }}
          >
            {drawMode ? t('adminMap.clickTwoCorners') : t('adminMap.drawBbox')}
          </Button>
        </Box>
      </Box>
      <Paper
        sx={{
          width: 360,
          p: 2,
          overflowY: 'auto',
          borderRadius: 0,
        }}
      >
        <Typography variant="h2" gutterBottom>
          {t('adminMap.bagAddresses')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('adminMap.drawHint')}
        </Typography>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && buildings.length > 0 && (
          <>
            <List dense sx={{ mb: 2 }}>
              {buildings.map((b, i) => (
                <ListItem
                  key={i}
                  disablePadding
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                    />
                  }
                >
                  <ListItemButton
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <ListItemText
                      primary={`${b.street_name} ${b.house_number}`}
                      primaryTypographyProps={{
                        fontWeight: selected.has(i) ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              disabled={bulkCreateMutation.isPending || selected.size === 0}
            >
              {bulkCreateMutation.isPending ? t('common.saving') : t('adminMap.saveSelected', { count: selected.size })}
            </Button>
          </>
        )}
        {!loading && buildings.length === 0 && !message && (
          <Typography variant="body2" color="text.secondary">
            {t('adminMap.noAddressesLoaded')}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

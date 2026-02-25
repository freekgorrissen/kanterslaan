"""
Dutch Kadaster BAG API client with EPSG:28992 (RD) to WGS84 conversion.

API: https://api.pdok.nl/kadaster/bag/ogc/v2
Fetches verblijfsobject (addresses) and pand (buildings) to return addresses
with actual building geometry from the BAG.
"""

import requests
from pyproj import Transformer
from django.contrib.gis.geos import Point, Polygon

# Transformer: EPSG:28992 (Dutch RD) -> EPSG:4326 (WGS84)
_RD_TO_WGS84 = Transformer.from_crs("EPSG:28992", "EPSG:4326", always_xy=True)


def rd_to_wgs84(x: float, y: float) -> tuple[float, float]:
    """Convert Rijksdriehoek (EPSG:28992) to WGS84 (lon, lat)."""
    lon, lat = _RD_TO_WGS84.transform(x, y)
    return (lon, lat)


def wgs84_to_rd(lon: float, lat: float) -> tuple[float, float]:
    """Convert WGS84 (lon, lat) to Rijksdriehoek (EPSG:28992)."""
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:28992", always_xy=True)
    x, y = transformer.transform(lon, lat)
    return (x, y)


def transform_geometry_to_wgs84(geom: dict) -> dict:
    """
    Transform geometry coordinates from EPSG:28992 to WGS84.
    Handles Point, Polygon, MultiPolygon.
    """
    if not geom or "coordinates" not in geom:
        return geom

    def transform_ring(ring):
        return [
            list(rd_to_wgs84(c[0], c[1])) + (c[2:] if len(c) > 2 else [])
            for c in ring
        ]

    geom_type = geom.get("type", "")
    coords = geom["coordinates"]

    if geom_type == "Point":
        lon, lat = rd_to_wgs84(coords[0], coords[1])
        return {"type": "Point", "coordinates": [lon, lat] + coords[2:]}
    if geom_type == "Polygon":
        return {"type": "Polygon", "coordinates": [transform_ring(ring) for ring in coords]}
    if geom_type == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [[transform_ring(ring) for ring in poly] for poly in coords],
        }
    return geom


def point_to_small_polygon(lon: float, lat: float, size_deg: float = 0.00002) -> list:
    """Create a small square polygon around a point (for Address geometry from adres Point)."""
    return [
        [lon - size_deg, lat - size_deg],
        [lon + size_deg, lat - size_deg],
        [lon + size_deg, lat + size_deg],
        [lon - size_deg, lat + size_deg],
        [lon - size_deg, lat - size_deg],
    ]


def _geom_to_polygon(geom: dict) -> Polygon | None:
    """Convert GeoJSON geometry to GEOS Polygon for point-in-polygon (Polygon only)."""
    if not geom or geom.get("type") != "Polygon":
        return None
    coords = geom.get("coordinates", [])
    if not coords:
        return None
    outer = coords[0]
    return Polygon([(c[0], c[1]) for c in outer])


def _find_containing_pand(lon: float, lat: float, panden: list[dict]) -> dict | None:
    """Find the pand that contains the given point."""
    pt = Point(lon, lat, srid=4326)
    for p in panden:
        geom = p.get("geometry")
        poly = _geom_to_polygon(geom)
        if poly and poly.contains(pt):
            return geom
    return None


def _fetch_collection(url: str, params: dict) -> list[dict]:
    """Fetch features from BAG OGC API."""
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json().get("features", [])


def _format_address(props: dict) -> tuple[str, str]:
    """Extract street_name and house_number from BAG properties."""
    street = props.get("openbare_ruimte_naam") or ""
    num = str(props.get("huisnummer") or "")
    letter = props.get("huisletter") or ""
    toev = props.get("toevoeging") or ""
    if letter:
        num = f"{num}{letter}"
    if toev:
        num = f"{num}-{toev}"
    return street, num


BAG_API_BASE = "https://api.pdok.nl/kadaster/bag/ogc/v2"


def fetch_bag_addresses_bbox(
    min_lon: float, min_lat: float, max_lon: float, max_lat: float, limit: int = 500
) -> list[dict]:
    """
    Fetch BAG addresses with actual building geometry (pand Polygon).
    Uses verblijfsobject for address info and pand for building footprints.
    Returns list of dicts with street_name, house_number, geometry (Polygon or MultiPolygon).
    """
    bbox = f"{min_lon},{min_lat},{max_lon},{max_lat}"
    params = {"bbox": bbox, "limit": limit, "f": "json"}

    verblijf_url = f"{BAG_API_BASE}/collections/verblijfsobject/items"
    pand_url = f"{BAG_API_BASE}/collections/pand/items"

    verblijf_features = _fetch_collection(verblijf_url, params)
    pand_features = _fetch_collection(pand_url, params)

    result = []
    for f in verblijf_features:
        props = f.get("properties", {})
        geom = f.get("geometry")
        if not geom or geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]

        street, num = _format_address(props)

        building_geom = _find_containing_pand(lon, lat, pand_features)
        if building_geom:
            geometry = building_geom
        else:
            geometry = {
                "type": "Polygon",
                "coordinates": [point_to_small_polygon(lon, lat)],
            }

        result.append({
            "street_name": street,
            "house_number": num,
            "geometry": geometry,
            "bag_id": f.get("id"),
        })

    return result


def fetch_bag_buildings_bbox_rd(
    min_x: float, min_y: float, max_x: float, max_y: float, limit: int = 500
) -> list[dict]:
    """
    Fetch BAG addresses with bbox in EPSG:28992 (RD).
    Uses verblijfsobject + pand for actual building geometry. Converts to WGS84.
    """
    bbox = f"{min_x},{min_y},{max_x},{max_y}"
    params = {
        "bbox": bbox,
        "bbox-crs": "http://www.opengis.net/def/crs/EPSG/0/28992",
        "limit": limit,
        "f": "json",
    }

    verblijf_url = f"{BAG_API_BASE}/collections/verblijfsobject/items"
    pand_url = f"{BAG_API_BASE}/collections/pand/items"

    verblijf_features = _fetch_collection(verblijf_url, params)
    pand_features = _fetch_collection(pand_url, params)

    pand_features_wgs84 = []
    for p in pand_features:
        geom = p.get("geometry")
        if geom:
            pand_features_wgs84.append({
                "geometry": transform_geometry_to_wgs84(geom),
            })

    result = []
    for f in verblijf_features:
        props = f.get("properties", {})
        geom = f.get("geometry")
        if not geom or geom.get("type") != "Point":
            continue
        coords = geom.get("coordinates", [])
        if len(coords) < 2:
            continue
        x, y = coords[0], coords[1]
        lon, lat = rd_to_wgs84(x, y)

        street, num = _format_address(props)

        building_geom = _find_containing_pand(lon, lat, pand_features_wgs84)
        if building_geom:
            geometry = building_geom
        else:
            geometry = {
                "type": "Polygon",
                "coordinates": [point_to_small_polygon(lon, lat)],
            }

        result.append({
            "street_name": street,
            "house_number": num,
            "geometry": geometry,
            "bag_id": f.get("id"),
        })

    return result

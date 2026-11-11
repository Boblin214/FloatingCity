export type WorldLocationType =
    | 'central_court'
    | 'player_city'
    | 'tribe'
    | 'city'
    | 'outpost';

export type WorldLocationStatus =
    | 'available'
    | 'home'
    | 'neutral'
    | 'locked'
    | 'unknown';

export interface WorldLocationDefinition {
    id: string;
    name: string;
    type: WorldLocationType;
    mapX: number;
    mapY: number;
    icon: string;
    status: WorldLocationStatus;
    discovered: boolean;
    description: string;
}

export interface WorldMapDocument {
    id: string;
    version: number;
    size: {
        width: number;
        height: number;
    };
    background: string;
    camera: {
        initialZoom: number;
        minZoom: number;
        maxZoom: number;
    };
    playerCityCandidates: Array<{
        mapX: number;
        mapY: number;
    }>;
    fog: {
        cellWidth: number;
        cellHeight: number;
        safeRadius: number;
    };
    locations: WorldLocationDefinition[];
}

export interface SavedPlayerCityPosition {
    version: number;
    mapId: string;
    mapX: number;
    mapY: number;
}

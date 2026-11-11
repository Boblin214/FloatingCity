import { sys, Vec2 } from 'cc';
import { SavedPlayerCityPosition, WorldMapDocument } from './WorldMapTypes';

const STORAGE_KEY = 'floatingcity.playerCity.v1';

export class PlayerCityPositionStore {
    public static loadOrCreate(map: WorldMapDocument): Vec2 {
        const saved = this.read();
        if (
            saved
            && saved.version === map.version
            && saved.mapId === map.id
            && this.isInsideMap(saved.mapX, saved.mapY, map)
        ) {
            return new Vec2(saved.mapX, saved.mapY);
        }

        const candidates = map.playerCityCandidates;
        if (!candidates.length) {
            return new Vec2(map.size.width * 0.5, map.size.height * 0.5);
        }

        for (let attempt = 0; attempt < 20; attempt++) {
            const candidate = candidates[Math.floor(Math.random() * candidates.length)];
            const blocked = map.locations.some((location) => {
                if (location.type === 'player_city') {
                    return false;
                }
                return Vec2.distance(
                    new Vec2(candidate.mapX, candidate.mapY),
                    new Vec2(location.mapX, location.mapY),
                ) < 230;
            });
            if (!blocked) {
                this.save(map, candidate.mapX, candidate.mapY);
                return new Vec2(candidate.mapX, candidate.mapY);
            }
        }

        const fallback = candidates[0];
        this.save(map, fallback.mapX, fallback.mapY);
        return new Vec2(fallback.mapX, fallback.mapY);
    }

    public static save(map: WorldMapDocument, mapX: number, mapY: number): void {
        const safeX = Math.max(100, Math.min(map.size.width - 100, Math.round(mapX)));
        const safeY = Math.max(100, Math.min(map.size.height - 100, Math.round(mapY)));
        const payload: SavedPlayerCityPosition = {
            version: map.version,
            mapId: map.id,
            mapX: safeX,
            mapY: safeY,
        };
        try {
            sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('[PlayerCityPositionStore] Unable to persist player city position.', error);
        }
    }

    private static read(): SavedPlayerCityPosition | null {
        try {
            const text = sys.localStorage.getItem(STORAGE_KEY);
            return text ? JSON.parse(text) as SavedPlayerCityPosition : null;
        } catch (error) {
            console.warn('[PlayerCityPositionStore] Unable to read player city position.', error);
            return null;
        }
    }

    private static isInsideMap(mapX: number, mapY: number, map: WorldMapDocument): boolean {
        return Number.isFinite(mapX)
            && Number.isFinite(mapY)
            && mapX >= 100
            && mapY >= 100
            && mapX <= map.size.width - 100
            && mapY <= map.size.height - 100;
    }
}

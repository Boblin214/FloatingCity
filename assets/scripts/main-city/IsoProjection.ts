import { Vec2 } from 'cc';

/**
 * Converts logical city coordinates to an isometric 2D screen position.
 * The returned Y is also used as the ground contact point for depth sorting.
 */
export class IsoProjection {
    public static readonly DEFAULT_TILE_WIDTH = 104;
    public static readonly DEFAULT_TILE_HEIGHT = 52;

    public static gridToScreen(
        gridX: number,
        gridY: number,
        tileWidth = IsoProjection.DEFAULT_TILE_WIDTH,
        tileHeight = IsoProjection.DEFAULT_TILE_HEIGHT,
    ): Vec2 {
        return new Vec2(
            (gridX - gridY) * tileWidth * 0.5,
            -(gridX + gridY) * tileHeight * 0.5,
        );
    }

    public static depthScale(screenY: number): number {
        const normalizedDepth = Math.max(-1, Math.min(1, screenY / 320));
        return 0.96 - normalizedDepth * 0.07;
    }
}

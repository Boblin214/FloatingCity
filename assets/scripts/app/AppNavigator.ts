import { director } from 'cc';
import { SceneId, SceneIds } from './SceneIds';

/**
 * Small scene-level navigation service. Overlay pages have their own stack in
 * WorldMapUI; this service only owns full scene transitions.
 */
export class AppNavigator {
    private static loading = false;
    private static history: SceneId[] = [];

    public static go(sceneId: SceneId, rememberCurrent = true): void {
        if (this.loading) {
            return;
        }

        const current = director.getScene()?.name as SceneId | undefined;
        if (rememberCurrent && current && current !== sceneId) {
            this.history.push(current);
        }

        this.loading = true;
        director.loadScene(sceneId, (error) => {
            this.loading = false;
            if (error) {
                console.error(`[AppNavigator] Failed to load ${sceneId}.`, error);
            }
        });
    }

    public static back(fallback: SceneId = SceneIds.WorldMap): void {
        const target = this.history.pop() ?? fallback;
        this.go(target, false);
    }

    public static resetToWorldMap(): void {
        this.history.length = 0;
        this.go(SceneIds.WorldMap, false);
    }
}

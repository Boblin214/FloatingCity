import {
    _decorator,
    Canvas,
    Color,
    Component,
    EventTouch,
    Graphics,
    JsonAsset,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
    Vec3,
    resources,
} from 'cc';
import { AppNavigator } from '../app/AppNavigator';
import { SceneIds } from '../app/SceneIds';
import { UiFactory, UI } from '../ui/UiFactory';
import { WorldMapUI } from '../ui/WorldMapUI';
import { PlayerCityPositionStore } from './PlayerCityPositionStore';
import { WorldMapCameraController } from './WorldMapCameraController';
import { WorldLocationMarker } from './WorldLocationMarker';
import { WorldLocationDefinition, WorldMapDocument } from './WorldMapTypes';

const { ccclass } = _decorator;
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;

@ccclass('WorldMapController')
export class WorldMapController extends Component {
    private canvasNode: Node | null = null;
    private viewport: Node | null = null;
    private worldRoot: Node | null = null;
    private backgroundNode: Node | null = null;
    private locationLayer: Node | null = null;
    private fogLayer: Node | null = null;
    private uiRoot: Node | null = null;
    private cameraController: WorldMapCameraController | null = null;
    private mapDocument: WorldMapDocument | null = null;
    private ui: WorldMapUI | null = null;
    private readonly markers = new Map<string, WorldLocationMarker>();
    private selectedLocation: WorldLocationDefinition | null = null;
    private relocationMode = false;
    private relocationStart = new Vec2();
    private relocationMoved = false;

    protected start(): void {
        this.canvasNode = this.node.getComponent(Canvas) ? this.node : this.node.getChildByName('Canvas');
        if (!this.canvasNode) {
            console.error('[WorldMap] Canvas not found.');
            return;
        }
        this.resolveSceneNodes();
        void this.initializeMap();
    }

    protected onDestroy(): void {
        this.ui?.destroy();
    }

    private resolveSceneNodes(): void {
        if (!this.canvasNode) {
            return;
        }

        this.viewport = this.requireNode('WorldViewport', this.canvasNode, VIEW_WIDTH, VIEW_HEIGHT);
        this.worldRoot = this.requireNode('WorldRoot', this.viewport, 2700, 1280);
        this.backgroundNode = this.requireNode('MapBackground', this.worldRoot, 2700, 1280);
        this.requireNode('TerrainDecor', this.worldRoot, 2700, 1280);
        this.locationLayer = this.requireNode('LocationLayer', this.worldRoot, 2700, 1280);
        this.fogLayer = this.requireNode('FogLayer', this.worldRoot, 2700, 1280);
        this.requireNode('SelectionLayer', this.worldRoot, 2700, 1280);
        this.uiRoot = this.requireNode('GlobalUI', this.canvasNode, VIEW_WIDTH, VIEW_HEIGHT);

        this.cameraController = this.viewport.getComponent(WorldMapCameraController)
            ?? this.viewport.addComponent(WorldMapCameraController);
        this.cameraController.worldRoot = this.worldRoot;
        this.cameraController.worldWidth = 2700;
        this.cameraController.worldHeight = 1280;
        this.cameraController.viewWidth = VIEW_WIDTH;
        this.cameraController.viewHeight = VIEW_HEIGHT;

        this.viewport.on(Node.EventType.TOUCH_START, this.onRelocationTouchStart, this);
        this.viewport.on(Node.EventType.TOUCH_MOVE, this.onRelocationTouchMove, this);
        this.viewport.on(Node.EventType.TOUCH_END, this.onRelocationTouchEnd, this);
    }

    private async initializeMap(): Promise<void> {
        const mapAsset = await new Promise<JsonAsset | null>((resolve) => {
            resources.load('maps/world_map', JsonAsset, (error, asset) => {
                if (error || !asset) {
                    console.error('[WorldMap] Failed to load world map data.', error);
                    resolve(null);
                    return;
                }
                resolve(asset);
            });
        });
        if (!mapAsset) {
            return;
        }

        this.mapDocument = mapAsset.json as WorldMapDocument;
        this.ui = new WorldMapUI(this.uiRoot!, {
            onOpenCourt: () => AppNavigator.go(SceneIds.CentralCourt),
            onOpenPlayerCityRoute: () => this.ui?.showMainCityConfirmation(),
            onStartRelocation: () => this.startRelocation(),
            onCancelRelocation: () => this.cancelRelocation(),
            onMapInteractionChanged: (blocked) => {
                if (this.cameraController) {
                    this.cameraController.enabled = !blocked;
                }
            },
            onRequestTribeInfo: () => this.openTribeInfo(),
        });
        await this.ui.initialize();

        const background = await UiFactory.loadSpriteFrame(
            `${this.mapDocument.background}/spriteFrame`,
        );
        if (background && this.backgroundNode) {
            const transform = this.backgroundNode.getComponent(UITransform)!;
            transform.setContentSize(this.mapDocument.size.width, this.mapDocument.size.height);
            const sprite = this.backgroundNode.getComponent(Sprite)
                ?? this.backgroundNode.addComponent(Sprite);
            sprite.spriteFrame = background;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.backgroundNode.setPosition(new Vec3(0, 0, 0));
        } else if (this.backgroundNode) {
            const graphics = this.backgroundNode.addComponent(Graphics);
            graphics.fillColor = new Color(54, 88, 65, 255);
            graphics.rect(-1350, -640, 2700, 1280);
            graphics.fill();
        }

        const playerPosition = PlayerCityPositionStore.loadOrCreate(this.mapDocument);
        const locations = this.mapDocument.locations
            .map((location) => location.type === 'player_city'
                ? { ...location, mapX: playerPosition.x, mapY: playerPosition.y }
                : location);
        this.mapDocument.locations = locations;

        const frames = await Promise.all(
            locations.map((location) => UiFactory.loadSpriteFrame(`${location.icon}/spriteFrame`)),
        );
        const representativeFrames = new Map<string, SpriteFrame>();
        locations.forEach((location, index) => {
            const frame = frames[index];
            if (frame && !representativeFrames.has(location.type)) {
                representativeFrames.set(location.type, frame);
                this.ui?.registerLocationFrame(location.type, frame);
            }
            this.createLocationMarker(location, frame);
        });

        this.drawFog();
        this.cameraController?.focusMapCenter(this.mapDocument.camera.initialZoom);
        this.ui?.setLocationInfo(null);
        this.refreshMarkerOrder();
    }

    private createLocationMarker(location: WorldLocationDefinition, frame: SpriteFrame | null): void {
        if (!this.locationLayer || !this.mapDocument) {
            return;
        }
        const worldPosition = this.mapCoordinateToWorld(location.mapX, location.mapY);
        const existing = this.locationLayer.getChildByName(`Location_${location.id}`);
        const node = existing ?? UiFactory.createNode(
            `Location_${location.id}`,
            this.locationLayer,
            worldPosition,
            160,
            160,
        );
        node.setPosition(worldPosition);
        const marker = node.getComponent(WorldLocationMarker) ?? node.addComponent(WorldLocationMarker);
        marker.initialize(location, frame, (selected) => this.handleLocationSelected(selected));
        this.markers.set(location.id, marker);
    }

    private handleLocationSelected(location: WorldLocationDefinition): void {
        if (this.relocationMode) {
            return;
        }
        this.selectedLocation = location;
        for (const [id, marker] of this.markers) {
            marker.setSelected(id === location.id);
        }
        this.ui?.setLocationInfo(location);

        if (location.type === 'central_court') {
            AppNavigator.go(SceneIds.CentralCourt);
            return;
        }
        this.ui?.showLocation(location);
    }

    private openTribeInfo(): void {
        if (this.selectedLocation?.type === 'tribe') {
            this.ui?.showLocation(this.selectedLocation);
            return;
        }
        const firstTribe = this.mapDocument?.locations.find((location) => location.type === 'tribe');
        if (firstTribe) {
            this.ui?.showLocation(firstTribe);
            return;
        }
        this.ui?.showToast('地图上暂无可查看的部落');
    }

    private startRelocation(): void {
        this.relocationMode = true;
        this.relocationMoved = false;
        if (this.cameraController) {
            this.cameraController.enabled = true;
        }
        this.ui?.setRelocationMode(true);
        this.ui?.showToast('迁城模式：点击地图空地选择新位置');
    }

    private cancelRelocation(): void {
        this.relocationMode = false;
        this.relocationMoved = false;
        this.ui?.setRelocationMode(false, !success);
        this.ui?.showToast('已取消迁城');
    }

    private onRelocationTouchStart(event: EventTouch): void {
        if (!this.relocationMode) {
            return;
        }
        this.relocationStart.set(event.getUILocation());
        this.relocationMoved = false;
    }

    private onRelocationTouchMove(event: EventTouch): void {
        if (!this.relocationMode) {
            return;
        }
        if (Vec2.distance(this.relocationStart, event.getUILocation()) > 9) {
            this.relocationMoved = true;
        }
    }

    private onRelocationTouchEnd(event: EventTouch): void {
        if (!this.relocationMode || this.relocationMoved || !this.mapDocument || !this.worldRoot) {
            return;
        }

        const uiLocation = event.getUILocation();
        const screen = new Vec3(uiLocation.x - VIEW_WIDTH * 0.5, uiLocation.y - VIEW_HEIGHT * 0.5, 0);
        const scale = this.worldRoot.scale.x || 1;
        const worldX = (screen.x - this.worldRoot.position.x) / scale;
        const worldY = (screen.y - this.worldRoot.position.y) / scale;
        const mapX = Math.max(100, Math.min(this.mapDocument.size.width - 100, worldX + this.mapDocument.size.width * 0.5));
        const mapY = Math.max(100, Math.min(this.mapDocument.size.height - 100, this.mapDocument.size.height * 0.5 - worldY));

        this.relocationMode = false;
        if (this.cameraController) {
            this.cameraController.enabled = false;
        }
        this.ui?.showRelocationConfirmation(
            mapX,
            mapY,
            () => this.commitRelocation(mapX, mapY),
            () => this.finishRelocation(false),
        );
    }

    private commitRelocation(mapX: number, mapY: number): void {
        if (!this.mapDocument) {
            return;
        }
        PlayerCityPositionStore.save(this.mapDocument, mapX, mapY);
        const playerCity = this.mapDocument.locations.find((location) => location.type === 'player_city');
        if (playerCity) {
            playerCity.mapX = mapX;
            playerCity.mapY = mapY;
            this.markers.get(playerCity.id)?.node.setPosition(this.mapCoordinateToWorld(mapX, mapY));
            this.selectedLocation = playerCity;
        }
        this.finishRelocation(true);
        this.ui?.setLocationInfo(playerCity ?? null);
        this.ui?.showToast('迁城完成，主城位置已保存');
        this.refreshMarkerOrder();
    }

    private finishRelocation(success: boolean): void {
        this.relocationMode = false;
        this.relocationMoved = false;
        this.ui?.setRelocationMode(false);
        if (this.cameraController) {
            this.cameraController.enabled = true;
        }
        if (!success) {
            this.ui?.showToast('已取消迁城');
        }
    }

    private drawFog(): void {
        if (!this.fogLayer || !this.mapDocument) {
            return;
        }
        UiFactory.clearChildren(this.fogLayer);
        const fogNode = UiFactory.createNode(
            'FogPaint',
            this.fogLayer,
            new Vec3(),
            this.mapDocument.size.width,
            this.mapDocument.size.height,
        );
        const graphics = fogNode.addComponent(Graphics);
        const halfW = this.mapDocument.size.width * 0.5;
        const halfH = this.mapDocument.size.height * 0.5;

        graphics.fillColor = new Color(5, 15, 22, 145);
        graphics.moveTo(-halfW, halfH);
        graphics.lineTo(-halfW + 720, halfH);
        graphics.lineTo(-halfW + 430, halfH - 270);
        graphics.lineTo(-halfW, halfH - 430);
        graphics.close();
        graphics.fill();

        graphics.fillColor = new Color(8, 20, 27, 130);
        graphics.moveTo(halfW - 660, -halfH);
        graphics.lineTo(halfW, -halfH);
        graphics.lineTo(halfW, halfH - 520);
        graphics.lineTo(halfW - 390, -halfH + 110);
        graphics.close();
        graphics.fill();

        const blobs = [
            [-940, 430, 330, 150], [-650, 510, 240, 120], [760, 470, 350, 150],
            [1040, 350, 260, 120], [-960, -390, 340, 150], [980, -420, 330, 150],
        ];
        blobs.forEach(([x, y, rx, ry], index) => {
            graphics.fillColor = new Color(12, 29, 35, index % 2 === 0 ? 75 : 55);
            graphics.ellipse(x, y, rx, ry);
            graphics.fill();
        });

        UiFactory.addLabel(
            fogNode,
            'FogLabelOne',
            '未探索云海',
            new Vec3(-850, 430),
            180,
            16,
            new Color(180, 204, 196, 180),
        );
        UiFactory.addLabel(
            fogNode,
            'FogLabelTwo',
            '未探索云海',
            new Vec3(910, -390),
            180,
            16,
            new Color(180, 204, 196, 180),
        );
    }

    private mapCoordinateToWorld(mapX: number, mapY: number): Vec3 {
        const width = this.mapDocument?.size.width ?? 2700;
        const height = this.mapDocument?.size.height ?? 1280;
        return new Vec3(mapX - width * 0.5, height * 0.5 - mapY, 0);
    }

    private refreshMarkerOrder(): void {
        if (!this.locationLayer) {
            return;
        }
        [...this.locationLayer.children]
            .sort((first, second) => second.position.y - first.position.y)
            .forEach((node, index) => node.setSiblingIndex(index));
    }

    private requireNode(name: string, parent: Node, width: number, height: number): Node {
        const existing = parent.getChildByName(name);
        if (existing) {
            const transform = existing.getComponent(UITransform) ?? existing.addComponent(UITransform);
            transform.setContentSize(width, height);
            return existing;
        }
        return UiFactory.createNode(name, parent, new Vec3(), width, height);
    }
}

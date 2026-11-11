import {
    _decorator,
    Canvas,
    Color,
    Component,
    Graphics,
    JsonAsset,
    Label,
    LabelOutline,
    Layers,
    Node,
    Tween,
    UITransform,
    Vec2,
    Vec3,
    resources,
    tween,
} from 'cc';
import { BuildingInteraction } from './BuildingInteraction';
import { CityCameraController } from './CityCameraController';
import { BuildingKind, CityVisualPainter } from './CityVisualPainter';
import { IsoProjection } from './IsoProjection';

const { ccclass } = _decorator;

interface BuildingLayout {
    id: string;
    name: string;
    kind: BuildingKind;
    gridX: number;
    gridY: number;
    width: number;
    height: number;
    accent: string;
}

interface MainCityLayout {
    tileWidth: number;
    tileHeight: number;
    buildings: BuildingLayout[];
}

interface SortableVisual {
    node: Node;
    baseY: number;
    depthBias: number;
}

interface BuildingView extends SortableVisual {
    id: string;
    name: string;
    width: number;
    height: number;
    baseScale: number;
}

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;

@ccclass('MainCityController')
export class MainCityController extends Component {
    private canvasNode: Node | null = null;
    private worldRoot: Node | null = null;
    private sortableLayer: Node | null = null;
    private selectionNode: Node | null = null;
    private selectionInfo: Label | null = null;
    private selectionSubtitle: Label | null = null;
    private readonly sortables: SortableVisual[] = [];
    private readonly buildingViews = new Map<string, BuildingView>();

    protected start(): void {
        this.canvasNode = this.node.getComponent(Canvas) ? this.node : this.node.getChildByName('Canvas');
        if (!this.canvasNode) {
            console.error('[MainCity] Canvas not found.');
            return;
        }
        this.loadLayout();
    }

    private loadLayout(): void {
        resources.load('main-city/layout', JsonAsset, (error, asset) => {
            if (error || !asset) {
                console.error('[MainCity] Failed to load layout.', error);
                return;
            }
            this.buildScene(asset.json as MainCityLayout);
        });
    }

    private buildScene(layout: MainCityLayout): void {
        if (!this.canvasNode) {
            return;
        }

        this.sortables.length = 0;
        this.buildingViews.clear();
        this.canvasNode.children
            .filter((child) => child.name.startsWith('MainCity_'))
            .forEach((child) => child.destroy());

        this.buildBackdrop(this.canvasNode);
        const viewport = this.createNode('MainCity_Viewport', this.canvasNode, new Vec3(), VIEW_WIDTH, VIEW_HEIGHT);
        this.worldRoot = this.createNode('MainCity_WorldRoot', viewport, new Vec3(0, 20), 1840, 980);

        this.drawGround(this.worldRoot);
        this.drawRoads(this.worldRoot);

        this.sortableLayer = this.createNode('MainCity_Sortable', this.worldRoot, new Vec3(), 1840, 980);
        this.addEnvironmentProps();
        layout.buildings.forEach((building) => this.addBuilding(building, layout.tileWidth, layout.tileHeight));
        this.sortVisuals();

        this.selectionNode = this.createNode('MainCity_Selection', this.worldRoot, new Vec3(), 260, 150);
        this.selectionNode.active = false;
        this.buildForeground(this.worldRoot);
        this.buildHud(this.canvasNode);
        this.installCameraControls(viewport);
    }

    private buildBackdrop(parent: Node): void {
        const backdrop = this.createNode('MainCity_Backdrop', parent, new Vec3(), VIEW_WIDTH, VIEW_HEIGHT);
        const graphics = backdrop.addComponent(Graphics);

        const bands = [
            new Color(8, 18, 28, 255),
            new Color(11, 29, 39, 255),
            new Color(15, 43, 51, 255),
            new Color(23, 58, 61, 255),
            new Color(34, 69, 67, 255),
        ];
        const bandHeight = VIEW_HEIGHT / bands.length;
        bands.forEach((color, index) => {
            graphics.fillColor = color;
            graphics.rect(-VIEW_WIDTH * 0.5, -VIEW_HEIGHT * 0.5 + index * bandHeight, VIEW_WIDTH, bandHeight + 1);
            graphics.fill();
        });

        graphics.fillColor = new Color(96, 166, 148, 28);
        graphics.ellipse(80, 105, 510, 220);
        graphics.fill();
        graphics.fillColor = new Color(255, 185, 98, 16);
        graphics.ellipse(-380, 115, 300, 150);
        graphics.fill();

        graphics.fillColor = new Color(6, 18, 24, 150);
        polygon(graphics, [
            -640, -140,
            -500, -35,
            -330, -120,
            -130, 10,
            20, -95,
            210, 15,
            420, -105,
            640, -30,
            640, -360,
            -640, -360,
        ]);

        graphics.fillColor = new Color(7, 17, 22, 210);
        polygon(graphics, [
            -640, -235,
            -470, -115,
            -280, -210,
            -70, -112,
            115, -205,
            325, -108,
            520, -195,
            640, -125,
            640, -360,
            -640, -360,
        ]);

        const stars = [
            [-540, 260, 2], [-420, 190, 1], [-260, 245, 2], [-120, 160, 1],
            [55, 250, 2], [170, 185, 1], [310, 240, 2], [470, 175, 1],
            [575, 265, 2], [-350, 305, 1], [395, 302, 1],
        ];
        stars.forEach(([x, y, radius]) => {
            graphics.fillColor = new Color(217, 236, 199, 120);
            graphics.circle(x, y, radius);
            graphics.fill();
        });

        graphics.fillColor = new Color(2, 7, 10, 62);
        graphics.rect(-640, -360, 90, 720);
        graphics.rect(550, -360, 90, 720);
        graphics.fill();
    }

    private drawGround(parent: Node): void {
        const ground = this.createNode('MainCity_Ground', parent, new Vec3(0, -20), 1840, 980);
        const graphics = ground.addComponent(Graphics);

        diamond(graphics, -68, 1760, 850, new Color(4, 8, 12, 165));
        polygon(graphics, [
            -870, 10,
            -865, -60,
            0, -350,
            865, -60,
            870, 10,
            0, -300,
        ], new Color(37, 45, 43, 255));
        diamond(graphics, 0, 1740, 830, new Color(47, 63, 52, 255));
        diamond(graphics, 10, 1580, 720, new Color(58, 75, 57, 255));
        diamond(graphics, 22, 1410, 620, new Color(66, 83, 61, 255));

        graphics.strokeColor = new Color(129, 145, 104, 75);
        graphics.lineWidth = 2;
        for (let index = -6; index <= 6; index++) {
            const start = IsoProjection.gridToScreen(index, -7, 104, 52);
            const end = IsoProjection.gridToScreen(index, 7, 104, 52);
            graphics.moveTo(start.x, start.y);
            graphics.lineTo(end.x, end.y);

            const crossStart = IsoProjection.gridToScreen(-7, index, 104, 52);
            const crossEnd = IsoProjection.gridToScreen(7, index, 104, 52);
            graphics.moveTo(crossStart.x, crossStart.y);
            graphics.lineTo(crossEnd.x, crossEnd.y);
        }
        graphics.stroke();

        this.drawDistrict(graphics, -310, 135, new Color(72, 83, 72, 155));
        this.drawDistrict(graphics, 310, 135, new Color(72, 78, 68, 155));
        this.drawDistrict(graphics, -260, -125, new Color(82, 73, 59, 145));
        this.drawDistrict(graphics, 260, -125, new Color(75, 72, 62, 145));

        const pond = this.worldToGroundPoint(-445, 185);
        diamond(graphics, pond.y, 220, 90, new Color(42, 110, 117, 220));
        graphics.strokeColor = new Color(139, 205, 197, 110);
        graphics.lineWidth = 3;
        graphics.moveTo(pond.x - 74, pond.y + 3);
        graphics.lineTo(pond.x + 10, pond.y + 32);
        graphics.stroke();

        graphics.strokeColor = new Color(223, 213, 166, 105);
        graphics.lineWidth = 5;
        graphics.moveTo(-870, 10);
        graphics.lineTo(0, 425);
        graphics.lineTo(870, 10);
        graphics.lineTo(0, -415);
        graphics.close();
        graphics.stroke();

        for (let index = -8; index <= 8; index++) {
            const point = IsoProjection.gridToScreen(index, -8.8, 104, 52);
            graphics.fillColor = new Color(111, 105, 82, 190);
            graphics.roundRect(point.x - 8, point.y + 15, 16, 18, 2);
            graphics.fill();
            graphics.fillColor = new Color(158, 153, 124, 170);
            graphics.roundRect(point.x - 7, point.y + 30, 14, 5, 1);
            graphics.fill();
        }
    }

    private drawRoads(parent: Node): void {
        const roads = this.createNode('MainCity_Roads', parent, new Vec3(), 1840, 980);
        const graphics = roads.addComponent(Graphics);
        const roadLines = [
            [new Vec2(-630, 185), new Vec2(0, 45), new Vec2(630, -190)],
            [new Vec2(630, 185), new Vec2(0, 45), new Vec2(-630, -190)],
            [new Vec2(0, 330), new Vec2(0, 45), new Vec2(0, -330)],
        ];

        graphics.strokeColor = new Color(42, 40, 35, 205);
        graphics.lineWidth = 92;
        this.traceRoads(graphics, roadLines);
        graphics.stroke();

        graphics.strokeColor = new Color(137, 125, 99, 255);
        graphics.lineWidth = 72;
        this.traceRoads(graphics, roadLines);
        graphics.stroke();

        graphics.strokeColor = new Color(183, 168, 128, 80);
        graphics.lineWidth = 3;
        this.traceRoads(graphics, roadLines);
        graphics.stroke();

        diamond(graphics, 48, 380, 178, new Color(145, 126, 93, 235));
        diamond(graphics, 60, 330, 146, new Color(183, 157, 111, 255));
        diamond(graphics, 70, 286, 120, new Color(92, 113, 84, 255));
    }

    private buildForeground(parent: Node): void {
        const foreground = this.createNode('MainCity_Foreground', parent, new Vec3(), 1840, 980);
        const graphics = foreground.addComponent(Graphics);
        graphics.strokeColor = new Color(217, 182, 112, 180);
        graphics.lineWidth = 3;
        graphics.moveTo(-440, -278);
        graphics.lineTo(-160, -356);
        graphics.stroke();
        graphics.moveTo(440, -278);
        graphics.lineTo(160, -356);
        graphics.stroke();

        const bannerColors = [new Color(172, 58, 48, 255), new Color(55, 109, 114, 255)];
        [-485, -395, 395, 485].forEach((x, index) => {
            const y = index % 2 === 0 ? -305 : -290;
            graphics.strokeColor = new Color(26, 30, 33, 255);
            graphics.lineWidth = 4;
            graphics.moveTo(x, y);
            graphics.lineTo(x, y + 76);
            graphics.stroke();
            graphics.fillColor = bannerColors[index % bannerColors.length];
            polygon(graphics, [x, y + 75, x + 28, y + 66, x + 23, y + 37, x, y + 44]);
        });
    }

    private buildHud(parent: Node): void {
        const hud = this.createNode('MainCity_Hud', parent, new Vec3(), VIEW_WIDTH, VIEW_HEIGHT);
        const graphics = hud.addComponent(Graphics);

        graphics.fillColor = new Color(6, 14, 19, 180);
        graphics.roundRect(-620, 282, 1240, 64, 10);
        graphics.fill();
        graphics.strokeColor = new Color(226, 186, 107, 110);
        graphics.lineWidth = 2;
        graphics.roundRect(-620, 282, 1240, 64, 10);
        graphics.stroke();

        graphics.fillColor = new Color(7, 16, 22, 225);
        graphics.roundRect(-255, -337, 510, 72, 12);
        graphics.fill();
        graphics.strokeColor = new Color(228, 188, 105, 180);
        graphics.lineWidth = 2;
        graphics.roundRect(-255, -337, 510, 72, 12);
        graphics.stroke();

        this.addLabel('浮空城 · 主城原型', hud, new Vec3(-475, 314), 22, new Color(246, 224, 176, 255), 260);
        this.addLabel('FLOATING CITY / STAGE 01', hud, new Vec3(-475, 294), 10, new Color(143, 170, 160, 255), 270);
        this.addLabel('拖动画面   滚轮 / 双指缩放', hud, new Vec3(392, 310), 14, new Color(199, 214, 196, 255), 320);

        this.selectionInfo = this.addLabel('点击建筑查看信息', hud, new Vec3(0, -292), 18, new Color(247, 222, 164, 255), 430);
        this.selectionSubtitle = this.addLabel('城市交互占位 · 暂不进入玩法', hud, new Vec3(0, -316), 12, new Color(151, 174, 166, 255), 430);

        const compass = this.createNode('MainCity_Compass', hud, new Vec3(558, 279), 60, 60);
        const compassGraphics = compass.addComponent(Graphics);
        compassGraphics.strokeColor = new Color(224, 188, 112, 170);
        compassGraphics.lineWidth = 2;
        compassGraphics.circle(0, 0, 24);
        compassGraphics.stroke();
        polygon(compassGraphics, [0, 18, 7, -12, 0, -7, -7, -12], new Color(235, 201, 127, 220));
        this.addLabel('N', compass, new Vec3(0, 36), 11, new Color(228, 199, 137, 255), 20);
    }

    private installCameraControls(viewport: Node): void {
        if (!this.worldRoot) {
            return;
        }
        const controls = viewport.addComponent(CityCameraController);
        controls.worldRoot = this.worldRoot;
        controls.worldWidth = 1840;
        controls.worldHeight = 980;
        controls.viewWidth = VIEW_WIDTH;
        controls.viewHeight = VIEW_HEIGHT;
    }

    private addBuilding(layout: BuildingLayout, tileWidth: number, tileHeight: number): void {
        if (!this.sortableLayer) {
            return;
        }

        const screen = IsoProjection.gridToScreen(layout.gridX, layout.gridY, tileWidth, tileHeight);
        const depthScale = IsoProjection.depthScale(screen.y);
        const node = this.createNode(
            `MainCity_Building_${layout.id}`,
            this.sortableLayer,
            new Vec3(screen.x, screen.y),
            layout.width,
            layout.height,
        );
        node.setScale(new Vec3(depthScale, depthScale, 1));

        const transform = node.getComponent(UITransform);
        transform?.setAnchorPoint(0.5, 0);

        const graphics = node.addComponent(Graphics);
        CityVisualPainter.paintBuilding(
            graphics,
            layout.kind,
            layout.width,
            layout.height,
            Color.fromHEX(new Color(), layout.accent),
        );

        const label = this.addLabel(
            layout.name,
            node,
            new Vec3(0, layout.height + 12),
            13,
            new Color(242, 226, 187, 235),
            150,
        );
        label.node.setScale(new Vec3(1 / depthScale, 1 / depthScale, 1));

        const interaction = node.addComponent(BuildingInteraction);
        interaction.buildingId = layout.id;
        interaction.displayName = layout.name;
        interaction.onSelect = (id, selectedNode) => this.selectBuilding(id, selectedNode);

        this.buildingViews.set(layout.id, {
            id: layout.id,
            name: layout.name,
            width: layout.width,
            height: layout.height,
            baseScale: depthScale,
            node,
            baseY: screen.y,
            depthBias: 2,
        });
        this.sortables.push(this.buildingViews.get(layout.id)!);
    }

    private addEnvironmentProps(): void {
        if (!this.sortableLayer) {
            return;
        }

        const treePositions = [
            [-500, 175], [-420, 200], [470, 165], [520, 125],
            [-505, -45], [-420, -105], [430, -60], [520, 20],
            [-330, 265], [310, 270],
        ];
        treePositions.forEach(([gridX, gridY], index) => {
            const screen = IsoProjection.gridToScreen(gridX, gridY, 104, 52);
            const node = this.createNode(
                `MainCity_Tree_${index}`,
                this.sortableLayer!,
                new Vec3(screen.x, screen.y),
                66,
                112,
            );
            const scale = IsoProjection.depthScale(screen.y) * 0.88;
            node.setScale(new Vec3(scale, scale, 1));
            node.getComponent(UITransform)?.setAnchorPoint(0.5, 0);
            CityVisualPainter.paintTree(node.addComponent(Graphics), 66, 112);
            this.sortables.push({ node, baseY: screen.y, depthBias: 1 });
        });

        [-280, 0, 280].forEach((gridX, index) => {
            const screen = IsoProjection.gridToScreen(gridX, 3.5, 104, 52);
            const node = this.createNode(
                `MainCity_Lantern_${index}`,
                this.sortableLayer!,
                new Vec3(screen.x, screen.y),
                42,
                108,
            );
            const scale = IsoProjection.depthScale(screen.y);
            node.setScale(new Vec3(scale, scale, 1));
            node.getComponent(UITransform)?.setAnchorPoint(0.5, 0);
            CityVisualPainter.paintLantern(node.addComponent(Graphics));
            this.sortables.push({ node, baseY: screen.y, depthBias: 1 });
        });
    }

    private sortVisuals(): void {
        this.sortables
            .slice()
            .sort((first, second) => (second.baseY + second.depthBias) - (first.baseY + first.depthBias))
            .forEach((item, index) => item.node.setSiblingIndex(index));
    }

    private selectBuilding(buildingId: string, node: Node): void {
        const building = this.buildingViews.get(buildingId);
        if (!building || !this.selectionNode) {
            return;
        }

        Tween.stopAllByTarget(node);
        node.setScale(new Vec3(building.baseScale, building.baseScale, 1));
        tween(node)
            .to(0.08, { scale: new Vec3(building.baseScale * 1.05, building.baseScale * 1.05, 1) })
            .to(0.12, { scale: new Vec3(building.baseScale, building.baseScale, 1) })
            .start();

        this.selectionNode.active = true;
        this.selectionNode.setPosition(building.node.position);
        this.selectionNode.setSiblingIndex(Math.max(0, this.sortableLayer?.children.length ?? 0));

        const transform = this.selectionNode.getComponent(UITransform);
        transform?.setContentSize(building.width + 52, building.height + 30);
        const graphics = this.selectionNode.getComponent(Graphics) ?? this.selectionNode.addComponent(Graphics);
        CityVisualPainter.paintSelection(graphics, building.width + 26, Math.max(86, building.width * 0.42));

        if (this.selectionInfo) {
            this.selectionInfo.string = `已选中 · ${building.name}`;
        }
        if (this.selectionSubtitle) {
            this.selectionSubtitle.string = `建筑 ID：${building.id}　交互占位，暂不进入玩法`;
        }
    }

    private drawDistrict(graphics: Graphics, x: number, y: number, color: Color): void {
        graphics.fillColor = color;
        graphics.moveTo(x - 175, y);
        graphics.lineTo(x, y + 86);
        graphics.lineTo(x + 175, y);
        graphics.lineTo(x, y - 86);
        graphics.close();
        graphics.fill();
    }

    private traceRoads(graphics: Graphics, lines: Vec2[][]): void {
        lines.forEach((points) => {
            graphics.moveTo(points[0].x, points[0].y);
            for (let index = 1; index < points.length; index++) {
                graphics.lineTo(points[index].x, points[index].y);
            }
        });
    }

    private worldToGroundPoint(gridX: number, gridY: number): Vec2 {
        return IsoProjection.gridToScreen(gridX / 104, gridY / 104, 104, 52);
    }

    private createNode(
        name: string,
        parent: Node,
        position: Vec3,
        width = 0,
        height = 0,
    ): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setParent(parent);
        node.setPosition(position);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(width, height);
        return node;
    }

    private addLabel(
        text: string,
        parent: Node,
        position: Vec3,
        fontSize: number,
        color: Color,
        width: number,
    ): Label {
        const node = this.createNode(`MainCity_Label_${text}`, parent, position, width, fontSize + 12);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.useSystemFont = true;

        const outline = node.addComponent(LabelOutline);
        outline.color = new Color(7, 12, 16, 210);
        outline.width = 2;
        return label;
    }
}

function diamond(graphics: Graphics, centerY: number, width: number, depth: number, color: Color): void {
    graphics.fillColor = color;
    graphics.moveTo(-width * 0.5, centerY);
    graphics.lineTo(0, centerY + depth * 0.5);
    graphics.lineTo(width * 0.5, centerY);
    graphics.lineTo(0, centerY - depth * 0.5);
    graphics.close();
    graphics.fill();
}

function polygon(graphics: Graphics, points: number[]): void {
    graphics.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 2) {
        graphics.lineTo(points[index], points[index + 1]);
    }
    graphics.close();
    graphics.fill();
}

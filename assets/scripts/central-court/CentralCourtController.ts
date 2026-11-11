import {
    _decorator,
    Canvas,
    Color,
    Component,
    EventKeyboard,
    Graphics,
    Input,
    KeyCode,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3,
    input,
} from 'cc';
import { AppNavigator } from '../app/AppNavigator';
import { SceneIds } from '../app/SceneIds';
import { UiFactory, UI } from '../ui/UiFactory';

const { ccclass } = _decorator;
const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;

@ccclass('CentralCourtController')
export class CentralCourtController extends Component {
    private canvasNode: Node | null = null;
    private built = false;

    protected start(): void {
        this.canvasNode = this.node.getComponent(Canvas) ? this.node : this.node.getChildByName('Canvas');
        if (!this.canvasNode) {
            console.error('[CentralCourt] Canvas not found.');
            return;
        }
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        void this.buildCourt();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private async buildCourt(): Promise<void> {
        if (!this.canvasNode || this.built) {
            return;
        }
        this.built = true;

        const [background, palace, wall, heroHead] = await Promise.all([
            UiFactory.loadSpriteFrame('legacy/court/court_background/spriteFrame'),
            UiFactory.loadSpriteFrame('legacy/court/palace/spriteFrame'),
            UiFactory.loadSpriteFrame('legacy/court/wall/spriteFrame'),
            UiFactory.loadSpriteFrame('legacy/heroes/heads/hero_1_head/spriteFrame'),
        ]);
        if (!this.canvasNode || !this.canvasNode.isValid) {
            return;
        }

        const viewport = this.requireNode('CourtViewport', this.canvasNode, VIEW_WIDTH, VIEW_HEIGHT);
        const backdropNode = this.requireNode('CourtBackground', viewport, VIEW_WIDTH, VIEW_HEIGHT);
        this.setSprite(backdropNode, background, 1519, 720);
        backdropNode.setSiblingIndex(0);

        const atelier = this.requireNode('CourtAtmosphere', viewport, VIEW_WIDTH, VIEW_HEIGHT);
        this.drawAtmosphere(atelier);

        const wallNode = this.requireNode('CourtWall', viewport, 1280, 230);
        wallNode.setPosition(new Vec3(0, -178));
        this.setSprite(wallNode, wall, 1280, 166);

        const palaceNode = this.requireNode('CourtPalace', viewport, 430, 560);
        palaceNode.setPosition(new Vec3(0, -10));
        this.setSprite(palaceNode, palace, 360, 360);

        const decorations = this.requireNode('CourtDecorations', viewport, VIEW_WIDTH, VIEW_HEIGHT);
        this.drawDecorations(decorations, heroHead);
        this.buildUI(this.canvasNode, heroHead);
    }

    private drawAtmosphere(parent: Node): void {
        const graphics = parent.addComponent(Graphics);
        graphics.fillColor = new Color(8, 27, 36, 90);
        graphics.rect(-640, 160, 1280, 200);
        graphics.fill();
        graphics.fillColor = new Color(231, 196, 123, 30);
        graphics.ellipse(0, 10, 470, 220);
        graphics.fill();
        graphics.fillColor = new Color(216, 235, 226, 34);
        graphics.ellipse(-520, 130, 290, 80);
        graphics.ellipse(430, 160, 350, 95);
        graphics.ellipse(-380, -220, 350, 72);
        graphics.ellipse(420, -210, 380, 78);
        graphics.fill();
        graphics.strokeColor = new Color(233, 200, 123, 50);
        graphics.lineWidth = 2;
        graphics.ellipse(0, -42, 420, 138);
        graphics.stroke();
    }

    private drawDecorations(parent: Node, heroHead: SpriteFrame | null): void {
        const graphics = parent.addComponent(Graphics);
        graphics.strokeColor = new Color(229, 188, 104, 100);
        graphics.lineWidth = 3;
        graphics.moveTo(-530, 220);
        graphics.lineTo(-270, 220);
        graphics.moveTo(270, 220);
        graphics.lineTo(530, 220);
        graphics.stroke();
        graphics.fillColor = new Color(185, 53, 46, 230);
        graphics.moveTo(-498, 218);
        graphics.lineTo(-450, 206);
        graphics.lineTo(-458, 158);
        graphics.lineTo(-498, 170);
        graphics.close();
        graphics.fill();
        graphics.fillColor = new Color(53, 112, 112, 230);
        graphics.moveTo(498, 218);
        graphics.lineTo(450, 206);
        graphics.lineTo(458, 158);
        graphics.lineTo(498, 170);
        graphics.close();
        graphics.fill();

        if (heroHead) {
            [0, 1, 2].forEach((index) => {
                const x = 350 + index * 48;
                UiFactory.addSprite(
                    parent,
                    `CourtHero${index + 1}`,
                    heroHead,
                    new Vec3(x, -238),
                    38,
                    38,
                );
            });
        }
    }

    private buildUI(parent: Node, heroHead: SpriteFrame | null): void {
        const hud = this.requireNode('CourtHud', parent, VIEW_WIDTH, VIEW_HEIGHT);
        UiFactory.clearChildren(hud);
        const top = UiFactory.addPanel(
            hud,
            'CourtHeader',
            new Vec3(0, 322),
            1250,
            72,
            new Color(8, 22, 28, 238),
            UI.goldSoft,
            10,
        );
        UiFactory.addLabel(
            top,
            'CourtTitle',
            '中央朝廷',
            new Vec3(-430, 12),
            360,
            27,
            UI.gold,
            Label.HorizontalAlign.LEFT,
        );
        UiFactory.addLabel(
            top,
            'CourtSubtitle',
            '三国英杰与天下诸城势力交汇之地',
            new Vec3(-430, -17),
            500,
            12,
            UI.muted,
            Label.HorizontalAlign.LEFT,
        );
        if (heroHead) {
            UiFactory.addSprite(top, 'CourtAvatar', heroHead, new Vec3(512, 0), 48, 48);
        }

        UiFactory.addButton(hud, new Vec3(-565, 258), {
            name: 'BackToWorldMap',
            text: '返回世界地图',
            width: 142,
            height: 42,
            accent: UI.jade,
            fontSize: 15,
            onClick: () => AppNavigator.go(SceneIds.WorldMap),
        });

        UiFactory.addButton(hud, new Vec3(0, -285), {
            name: 'EnterPlayerCity',
            text: '进入玩家主城',
            width: 250,
            height: 56,
            accent: UI.gold,
            fontSize: 20,
            fill: new Color(55, 49, 29, 245),
            onClick: () => AppNavigator.go(SceneIds.MainCity),
        });

        const info = UiFactory.addPanel(
            hud,
            'CourtInfo',
            new Vec3(-405, -126),
            290,
            214,
            new Color(7, 22, 28, 218),
            UI.goldSoft,
            10,
        );
        UiFactory.addLabel(info, 'InfoTitle', '朝廷主岛', new Vec3(0, 72), 220, 20, UI.gold);
        UiFactory.addLabel(
            info,
            'InfoBody',
            '天下政令与英雄招募的枢纽\n第一版仅开放场景浏览与主城入口',
            new Vec3(0, 12),
            245,
            14,
            UI.muted,
        );
        UiFactory.addLabel(
            info,
            'InfoHint',
            '交易 / 招募 / 经济系统\n留待后续阶段',
            new Vec3(0, -60),
            240,
            13,
            new Color(192, 156, 97, 220),
        );

        const hint = UiFactory.addPanel(
            hud,
            'CourtHint',
            new Vec3(438, -132),
            250,
            168,
            new Color(7, 22, 28, 205),
            new Color(225, 184, 98, 70),
            10,
        );
        UiFactory.addLabel(hint, 'HintTitle', '玩家主城入口', new Vec3(0, 54), 200, 18, UI.cream);
        UiFactory.addLabel(
            hint,
            'HintBody',
            '从朝廷进入已完成的\n玩家主城 Demo',
            new Vec3(0, 2),
            205,
            14,
            UI.muted,
        );
        UiFactory.addLabel(
            hint,
            'HintFooter',
            '主城返回路径：主城 → 朝廷 → 地图',
            new Vec3(0, -54),
            220,
            11,
            UI.jade,
        );
    }

    private setSprite(node: Node, frame: SpriteFrame | null, width: number, height: number): void {
        if (frame) {
            const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        const transform = node.getComponent(UITransform);
        transform?.setContentSize(width, height);
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

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.ESCAPE) {
            AppNavigator.go(SceneIds.WorldMap);
        }
    }
}

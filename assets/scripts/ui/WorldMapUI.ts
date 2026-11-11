import {
    BlockInputEvents,
    Color,
    EventKeyboard,
    Graphics,
    Input,
    KeyCode,
    Label,
    Node,
    SpriteFrame,
    UITransform,
    Vec3,
    input,
    tween,
} from 'cc';
import { UiFactory, UI } from './UiFactory';
import { WorldLocationDefinition } from '../world-map/WorldMapTypes';

export interface WorldMapUiCallbacks {
    onOpenCourt: () => void;
    onOpenPlayerCityRoute: () => void;
    onStartRelocation: () => void;
    onCancelRelocation: () => void;
    onMapInteractionChanged: (blocked: boolean) => void;
    onRequestTribeInfo: () => void;
}

interface PageDefinition {
    id: string;
    title: string;
    subtitle: string;
}

const HERO_NAMES = ['赵云', '蔡文姬', '颜良', '高顺', '李儒', '夏侯渊'];

const PAGE_DEFINITIONS: PageDefinition[] = [
    { id: 'bag', title: '背包', subtitle: '物资、道具与奖励收纳' },
    { id: 'friends', title: '好友', subtitle: '好友列表与拜访入口' },
    { id: 'mail', title: '邮件', subtitle: '系统邮件与战报消息' },
    { id: 'rank', title: '排行榜', subtitle: '本服与全服势力排行' },
    { id: 'settings', title: '设置', subtitle: '音效、画质与操作偏好' },
];

export class WorldMapUI {
    private readonly root: Node;
    private readonly callbacks: WorldMapUiCallbacks;
    private readonly pageLayer: Node;
    private readonly modalLayer: Node;
    private readonly toastLayer: Node;
    private readonly bottomInfo: Label;
    private readonly bottomHint: Label;
    private readonly frames = new Map<string, SpriteFrame>();
    private openOverlay = false;
    private relocationMode = false;

    public constructor(root: Node, callbacks: WorldMapUiCallbacks) {
        this.root = root;
        this.callbacks = callbacks;

        this.pageLayer = this.requireLayer('PageLayer');
        this.modalLayer = this.requireLayer('ModalLayer');
        this.toastLayer = this.requireLayer('ToastLayer');
        this.pageLayer.addComponent(BlockInputEvents);
        this.modalLayer.addComponent(BlockInputEvents);
        this.pageLayer.active = false;
        this.modalLayer.active = false;

        const reservedLayers = new Set(['PageLayer', 'ModalLayer', 'ToastLayer']);
        [...this.root.children]
            .filter((child) => !reservedLayers.has(child.name))
            .forEach((child) => child.destroy());
        const topBar = UiFactory.addPanel(
            this.root,
            'TopBar',
            new Vec3(0, 323),
            1250,
            72,
            new Color(9, 22, 28, 238),
            UI.goldSoft,
            9,
        );
        const leftNav = UiFactory.createNode('LeftNavigation', this.root, new Vec3(-575, 25), 112, 432);
        const rightNav = UiFactory.createNode('RightNavigation', this.root, new Vec3(575, 20), 112, 360);
        const bottomBar = UiFactory.addPanel(
            this.root,
            'BottomBar',
            new Vec3(0, -336),
            1250,
            54,
            new Color(7, 18, 23, 235),
            UI.goldSoft,
            8,
        );

        this.buildTopBar(topBar);
        this.buildNavigation(leftNav, rightNav);
        this.bottomInfo = UiFactory.addLabel(
            bottomBar,
            'LocationInfo',
            '世界地图 · 中央朝廷位于地图中心',
            new Vec3(-300, 1),
            590,
            15,
            UI.cream,
            Label.HorizontalAlign.LEFT,
        );
        this.bottomHint = UiFactory.addLabel(
            bottomBar,
            'MapHint',
            '拖动地图　滚轮/双指缩放　点击地点查看',
            new Vec3(345, 1),
            500,
            13,
            UI.muted,
            Label.HorizontalAlign.RIGHT,
        );
        this.pageLayer.setSiblingIndex(this.root.children.length - 1);
        this.modalLayer.setSiblingIndex(this.root.children.length - 1);
        this.toastLayer.setSiblingIndex(this.root.children.length - 1);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    public async initialize(): Promise<void> {
        const paths = [
            ['hero_1_head', 'legacy/heroes/heads/hero_1_head/spriteFrame'],
            ['gold', 'legacy/ui/icons/gold/spriteFrame'],
            ['supply', 'legacy/ui/icons/supply/spriteFrame'],
            ['power', 'legacy/ui/icons/power/spriteFrame'],
            ['resource', 'legacy/ui/icons/resource/spriteFrame'],
            ['back', 'legacy/ui/common/back/spriteFrame'],
            ['close', 'legacy/ui/common/close/spriteFrame'],
        ] as const;

        for (const [key, path] of paths) {
            const frame = await UiFactory.loadSpriteFrame(path);
            if (frame) {
                this.frames.set(key, frame);
            }
        }

        for (let index = 1; index <= 6; index++) {
            const card = await UiFactory.loadSpriteFrame(
                `legacy/heroes/cards/hero_${index}_card/spriteFrame`,
            );
            const head = await UiFactory.loadSpriteFrame(
                `legacy/heroes/heads/hero_${index}_head/spriteFrame`,
            );
            if (card) {
                this.frames.set(`hero_${index}_card`, card);
            }
            if (head) {
                this.frames.set(`hero_${index}_head`, head);
            }
        }

        const avatar = this.frames.get('hero_1_head');
        const topBar = this.root.getChildByName('TopBar');
        topBar?.getChildByName('AvatarPlaceholder')?.destroy();
        const avatarNode = avatar ? UiFactory.addSprite(
            topBar ?? this.root,
            'PlayerAvatar',
            avatar,
            new Vec3(-563, 0),
            52,
            52,
        )?.node : null;
        avatarNode?.setSiblingIndex(1);
    }

    public destroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    public setLocationInfo(location: WorldLocationDefinition | null): void {
        if (!location) {
            this.bottomInfo.string = '世界地图 · 选择地点查看信息';
            return;
        }
        this.bottomInfo.string = `${location.name}　·　${UiFactory.readableType(location.type)}　·　${UiFactory.readableStatus(location.status)}`;
    }

    public registerLocationFrame(type: string, frame: SpriteFrame | null): void {
        if (frame) {
            this.frames.set(`location_${type}`, frame);
        }
    }

    public setRelocationMode(active: boolean, canceled = true): void {
        this.relocationMode = active;
        this.bottomInfo.string = active
            ? '迁城模式：点击地图空地选择新主城位置'
            : canceled
                ? '迁城已取消'
                : '迁城完成：玩家主城位置已保存';
        this.bottomHint.string = active ? '当前位置将在确认后保存' : '拖动地图　滚轮/双指缩放　点击地点查看';
    }

    public showLocation(location: WorldLocationDefinition): void {
        this.openOverlayPanel(620, 430, `${location.name}`, `${UiFactory.readableType(location.type)}`, (panel) => {
            const icon = this.frames.get(`location_${location.type}`);
            if (icon) {
                UiFactory.addSprite(panel, 'LocationArt', icon, new Vec3(-185, 58), 180, 128);
            }

            UiFactory.addLabel(
                panel,
                'LocationType',
                `地点类型：${UiFactory.readableType(location.type)}`,
                new Vec3(115, 104),
                300,
                17,
                UI.cream,
                Label.HorizontalAlign.LEFT,
            );
            UiFactory.addLabel(
                panel,
                'LocationStatus',
                `当前状态：${UiFactory.readableStatus(location.status)}`,
                new Vec3(115, 64),
                300,
                16,
                UI.gold,
                Label.HorizontalAlign.LEFT,
            );
            UiFactory.addLabel(
                panel,
                'LocationDescription',
                location.description,
                new Vec3(110, 10),
                330,
                14,
                UI.muted,
                Label.HorizontalAlign.LEFT,
            );

            const actionText = location.type === 'central_court'
                ? '进入朝廷'
                : location.type === 'player_city'
                    ? '前往朝廷'
                    : '查看详情';
            UiFactory.addButton(panel, new Vec3(110, -112), {
                name: 'LocationAction',
                text: actionText,
                width: 180,
                height: 44,
                accent: UI.gold,
                onClick: () => {
                    this.closeOverlay();
                    if (location.type === 'central_court') {
                        this.callbacks.onOpenCourt();
                    } else if (location.type === 'player_city') {
                        this.callbacks.onOpenPlayerCityRoute();
                    } else {
                        this.openPlaceholderDetail(location);
                    }
                },
            });
        });
    }

    public showMainCityConfirmation(): void {
        this.showConfirmation(
            '迁往主城',
            '将通过中央朝廷进入你的玩家主城。是否继续？',
            '前往朝廷',
            () => {
                this.closeModal();
                this.callbacks.onOpenCourt();
            },
        );
    }

    public showRelocationConfirmation(
        mapX: number,
        mapY: number,
        onConfirm: () => void,
        onCancel: () => void,
    ): void {
        this.showConfirmation(
            '确认迁城',
            `目标位置：${Math.round(mapX)}, ${Math.round(mapY)}\n确认后玩家主城图标将移动到此处。`,
            '确认迁城',
            () => {
                this.closeModal();
                onConfirm();
            },
            () => {
                this.closeModal();
                onCancel();
            },
        );
    }

    public showToast(message: string): void {
        UiFactory.clearChildren(this.toastLayer);
        const node = UiFactory.addPanel(
            this.toastLayer,
            'ToastPanel',
            new Vec3(0, -265),
            460,
            42,
            new Color(10, 27, 31, 245),
            UI.goldSoft,
            8,
        );
        UiFactory.addLabel(node, 'ToastText', message, new Vec3(), 430, 15, UI.cream);
        node.active = true;
        tween(node)
            .delay(2.1)
            .call(() => {
                if (node.isValid) {
                    node.destroy();
                }
            })
            .start();
    }

    public showRelocationStartPage(): void {
        this.openSimplePage('迁城', '迁城选址', '进入地图选点模式，点击地图空地作为新主城位置。', [
            '第一版只保存本地位置，不校验真实迁城规则。',
            '选中位置后会弹出确认框。',
            '取消或点击返回不会修改当前主城位置。',
        ], '开始选点', () => {
            this.closeOverlay();
            this.setRelocationMode(true);
            this.callbacks.onStartRelocation();
        });
    }

    public showTeamPage(): void {
        this.openOverlayPanel(950, 560, '队伍编组', '两支远征队 · 占位框架', (panel) => {
            this.buildTeamSlot(panel, -230, '第一远征队', UI.gold);
            this.buildTeamSlot(panel, 230, '第二远征队', UI.jade);
        });
    }

    public showHeroPage(): void {
        this.openOverlayPanel(1030, 590, '英雄', '六名正式英雄 · 静态卡面与头像', (panel) => {
            for (let index = 0; index < 6; index++) {
                const column = index % 3;
                const row = Math.floor(index / 3);
                const x = -300 + column * 300;
                const y = 92 - row * 250;
                const card = this.frames.get(`hero_${index + 1}_card`);
                if (card) {
                    UiFactory.addSprite(panel, `HeroCard${index + 1}`, card, new Vec3(x, y), 172, 235);
                } else {
                    UiFactory.addPanel(
                        panel,
                        `HeroCardPlaceholder${index + 1}`,
                        new Vec3(x, y),
                        172,
                        235,
                        new Color(32, 66, 76, 230),
                        UI.goldSoft,
                        10,
                    );
                }
                const head = this.frames.get(`hero_${index + 1}_head`);
                if (head) {
                    UiFactory.addSprite(
                        panel,
                        `HeroHead${index + 1}`,
                        head,
                        new Vec3(x - 56, y - 94),
                        42,
                        42,
                    );
                }
                UiFactory.addLabel(
                    panel,
                    `HeroName${index + 1}`,
                    HERO_NAMES[index],
                    new Vec3(x, y - 127),
                    150,
                    16,
                    UI.cream,
                );
            }
        });
    }

    public showGenericPage(pageId: string): void {
        const definition = PAGE_DEFINITIONS.find((page) => page.id === pageId);
        if (!definition) {
            this.showToast('页面暂未开放');
            return;
        }
        this.openSimplePage(definition.title, definition.subtitle, '当前为第一版 UI 框架，业务内容将在后续阶段接入。', [
            '页面标题、布局和返回按钮已经可用。',
            '交互入口不会形成无法退出的空页面。',
            '数据与真实玩法逻辑暂未接入。',
        ]);
    }

    private buildTopBar(parent: Node): void {
        const avatar = this.frames.get('hero_1_head');
        if (avatar) {
            UiFactory.addSprite(parent, 'Avatar', avatar, new Vec3(-560, 0), 52, 52);
        } else {
            UiFactory.addPanel(parent, 'AvatarPlaceholder', new Vec3(-560, 0), 52, 52, UI.panelSoft, UI.goldSoft, 26);
        }
        UiFactory.addLabel(
            parent,
            'PlayerName',
            '云岚城主',
            new Vec3(-475, 14),
            160,
            19,
            UI.cream,
            Label.HorizontalAlign.LEFT,
        );
        UiFactory.addLabel(
            parent,
            'PlayerLevel',
            '浮空城 · LV.12',
            new Vec3(-475, -14),
            160,
            12,
            UI.muted,
            Label.HorizontalAlign.LEFT,
        );

        const values = [
            ['gold', '金币', '128,800', -248],
            ['supply', '物资', '45,200', -82],
            ['power', '战力', '68,430', 96],
            ['resource', '玉璧', '320', 286],
        ] as const;
        values.forEach(([iconKey, label, value, x]) => {
            const icon = this.frames.get(iconKey);
            if (icon) {
                UiFactory.addSprite(parent, `${iconKey}_Icon`, icon, new Vec3(x, 0), 34, 34);
            }
            UiFactory.addLabel(
                parent,
                `${label}_Title`,
                label,
                new Vec3(x + 55, 12),
                90,
                11,
                UI.muted,
                Label.HorizontalAlign.LEFT,
            );
            UiFactory.addLabel(
                parent,
                `${label}_Value`,
                value,
                new Vec3(x + 55, -12),
                110,
                17,
                UI.cream,
                Label.HorizontalAlign.LEFT,
            );
        });
        UiFactory.addLabel(parent, 'MapTitle', '天下舆图', new Vec3(542, 12), 120, 19, UI.gold);
        UiFactory.addLabel(parent, 'MapServer', 'S01 · 浮云境', new Vec3(542, -14), 120, 11, UI.muted);
    }

    private buildNavigation(left: Node, right: Node): void {
        const leftButtons = [
            ['英雄', 'hero'],
            ['背包', 'bag'],
            ['好友', 'friends'],
            ['邮件', 'mail'],
            ['排行榜', 'rank'],
            ['设置', 'settings'],
        ] as const;
        leftButtons.forEach(([label, id], index) => {
            UiFactory.addButton(left, new Vec3(0, 174 - index * 58), {
                name: `Nav_${id}`,
                text: label,
                width: 120,
                height: 44,
                accent: UI.jade,
                fontSize: 16,
                onClick: () => {
                    if (id === 'hero') {
                        this.showHeroPage();
                    } else {
                        this.showGenericPage(id);
                    }
                },
            });
        });

        const rightButtons = [
            ['迁城', 'relocate'],
            ['迁往主城', 'home'],
            ['队伍编组', 'team'],
            ['部落信息', 'tribe'],
            ['朝廷', 'court'],
        ] as const;
        rightButtons.forEach(([label, id], index) => {
            UiFactory.addButton(right, new Vec3(0, 170 - index * 68), {
                name: `Nav_${id}`,
                text: label,
                width: 120,
                height: 48,
                accent: id === 'court' ? UI.gold : UI.red,
                fontSize: 15,
                onClick: () => {
                    if (id === 'relocate') {
                        this.showRelocationStartPage();
                    } else if (id === 'home') {
                        this.showMainCityConfirmation();
                    } else if (id === 'team') {
                        this.showTeamPage();
                    } else if (id === 'tribe') {
                        this.callbacks.onRequestTribeInfo();
                    } else {
                        this.callbacks.onOpenCourt();
                    }
                },
            });
        });
    }

    private buildTeamSlot(parent: Node, x: number, title: string, accent: Color): void {
        const panel = UiFactory.addPanel(
            parent,
            `TeamSlot_${x}`,
            new Vec3(x, -10),
            380,
            390,
            new Color(15, 38, 42, 242),
            new Color(accent.r, accent.g, accent.b, 130),
            10,
        );
        UiFactory.addLabel(panel, 'TeamTitle', title, new Vec3(0, 155), 300, 21, accent);
        for (let index = 0; index < 3; index++) {
            UiFactory.addPanel(
                panel,
                `Slot${index}`,
                new Vec3(0, 72 - index * 92),
                310,
                72,
                new Color(27, 53, 57, 225),
                new Color(accent.r, accent.g, accent.b, 70),
                8,
            );
            UiFactory.addLabel(
                panel,
                `SlotText${index}`,
                `队伍槽位 ${index + 1} · 待配置`,
                new Vec3(0, 72 - index * 92),
                270,
                14,
                UI.muted,
            );
        }
    }

    private openSimplePage(
        title: string,
        subtitle: string,
        lead: string,
        rows: string[],
        primaryText?: string,
        primaryAction?: () => void,
    ): void {
        this.openOverlayPanel(760, 500, title, subtitle, (panel) => {
            UiFactory.addLabel(
                panel,
                'PageLead',
                lead,
                new Vec3(0, 118),
                630,
                16,
                UI.cream,
            );
            rows.forEach((row, index) => {
                const rowNode = UiFactory.addPanel(
                    panel,
                    `InfoRow${index}`,
                    new Vec3(0, 48 - index * 58),
                    620,
                    46,
                    new Color(28, 52, 56, 220),
                    new Color(225, 184, 98, 58),
                    6,
                );
                UiFactory.addLabel(
                    rowNode,
                    'RowText',
                    row,
                    new Vec3(),
                    580,
                    14,
                    UI.muted,
                    Label.HorizontalAlign.LEFT,
                );
            });

            if (primaryText && primaryAction) {
                UiFactory.addButton(panel, new Vec3(0, -174), {
                    name: 'PrimaryAction',
                    text: primaryText,
                    width: 190,
                    height: 44,
                    accent: UI.gold,
                    onClick: primaryAction,
                });
            }
        });
    }

    private openPlaceholderDetail(location: WorldLocationDefinition): void {
        this.openSimplePage(
            `${location.name} · 详情`,
            `${UiFactory.readableType(location.type)} · ${UiFactory.readableStatus(location.status)}`,
            location.description,
            [
                '驻军、资源和等级信息将在后续阶段接入。',
                '当前已打通地点点击、信息展示和返回路径。',
                '战斗、派遣与占领逻辑尚未实现。',
            ],
        );
    }

    private openOverlayPanel(
        width: number,
        height: number,
        title: string,
        subtitle: string,
        buildContent: (panel: Node) => void,
    ): void {
        this.closeOverlay();
        this.pageLayer.active = true;
        this.openOverlay = true;
        this.callbacks.onMapInteractionChanged(true);

        const overlay = UiFactory.createNode('OverlayRoot', this.pageLayer, new Vec3(), 1280, 720);
        const dim = overlay.addComponent(Graphics);
        dim.fillColor = new Color(2, 8, 12, 180);
        dim.rect(-640, -360, 1280, 720);
        dim.fill();
        overlay.addComponent(BlockInputEvents);

        const panel = UiFactory.addPanel(
            overlay,
            'ContentPanel',
            new Vec3(0, -4),
            width,
            height,
            new Color(11, 30, 35, 248),
            UI.goldSoft,
            14,
        );
        UiFactory.addLabel(
            panel,
            'PageTitle',
            title,
            new Vec3(-20, height * 0.5 - 38),
            width - 130,
            25,
            UI.gold,
            Label.HorizontalAlign.LEFT,
        );
        UiFactory.addLabel(
            panel,
            'PageSubtitle',
            subtitle,
            new Vec3(-20, height * 0.5 - 72),
            width - 130,
            13,
            UI.muted,
            Label.HorizontalAlign.LEFT,
        );

        UiFactory.addButton(panel, new Vec3(width * 0.5 - 78, height * 0.5 - 40), {
            name: 'BackButton',
            text: '返回',
            width: 94,
            height: 38,
            accent: UI.jade,
            fontSize: 15,
            onClick: () => this.closeOverlay(),
        });

        buildContent(panel);
    }

    private showConfirmation(
        title: string,
        message: string,
        confirmText: string,
        onConfirm: () => void,
        onCancel?: () => void,
    ): void {
        this.closeModal();
        this.modalLayer.active = true;
        this.callbacks.onMapInteractionChanged(true);
        const overlay = UiFactory.createNode('ModalRoot', this.modalLayer, new Vec3(), 1280, 720);
        const dim = overlay.addComponent(Graphics);
        dim.fillColor = new Color(2, 7, 10, 175);
        dim.rect(-640, -360, 1280, 720);
        dim.fill();
        overlay.addComponent(BlockInputEvents);

        const panel = UiFactory.addPanel(
            overlay,
            'ConfirmPanel',
            new Vec3(0, -18),
            610,
            330,
            new Color(13, 33, 37, 250),
            UI.goldSoft,
            14,
        );
        UiFactory.addLabel(panel, 'ConfirmTitle', title, new Vec3(0, 110), 520, 25, UI.gold);
        UiFactory.addLabel(panel, 'ConfirmMessage', message, new Vec3(0, 25), 530, 16, UI.cream);
        UiFactory.addButton(panel, new Vec3(-115, -105), {
            name: 'Confirm',
            text: confirmText,
            width: 180,
            height: 46,
            accent: UI.gold,
            onClick: onConfirm,
        });
        UiFactory.addButton(panel, new Vec3(115, -105), {
            name: 'Cancel',
            text: '取消',
            width: 150,
            height: 46,
            accent: UI.jade,
            onClick: () => {
                this.closeModal();
                onCancel?.();
            },
        });
    }

    private closeOverlay(): void {
        if (this.pageLayer) {
            UiFactory.clearChildren(this.pageLayer);
            this.pageLayer.active = false;
        }
        this.openOverlay = false;
        if (!this.modalLayer?.active) {
            this.callbacks.onMapInteractionChanged(false);
        }
    }

    private closeModal(): void {
        UiFactory.clearChildren(this.modalLayer);
        this.modalLayer.active = false;
        if (!this.pageLayer?.active) {
            this.callbacks.onMapInteractionChanged(false);
        }
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode !== KeyCode.ESCAPE) {
            return;
        }
        if (this.modalLayer.active) {
            this.closeModal();
        } else if (this.pageLayer.active) {
            this.closeOverlay();
        } else if (this.relocationMode) {
            this.setRelocationMode(false);
            this.callbacks.onCancelRelocation();
        }
    }

    private requireLayer(name: string): Node {
        const existing = this.root.getChildByName(name);
        if (existing) {
            return existing;
        }
        return UiFactory.createNode(name, this.root, new Vec3(), 1280, 720);
    }

}

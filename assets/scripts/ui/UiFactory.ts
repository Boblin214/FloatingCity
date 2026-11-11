import {
    Color,
    Graphics,
    Label,
    LabelOutline,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3,
    resources,
} from 'cc';

export const UI = {
    ink: new Color(9, 18, 24, 238),
    panel: new Color(18, 38, 43, 246),
    panelSoft: new Color(25, 52, 55, 238),
    gold: new Color(225, 184, 98, 255),
    goldSoft: new Color(225, 184, 98, 100),
    jade: new Color(104, 176, 154, 255),
    cream: new Color(245, 229, 194, 255),
    muted: new Color(155, 178, 169, 255),
    red: new Color(173, 72, 55, 255),
};

export interface UiButtonOptions {
    name: string;
    text: string;
    width: number;
    height: number;
    accent?: Color;
    fontSize?: number;
    fill?: Color;
    onClick: () => void;
}

export class UiFactory {
    public static createNode(
        name: string,
        parent: Node,
        position: Vec3,
        width: number,
        height: number,
    ): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setParent(parent);
        node.setPosition(position);
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    public static addLabel(
        parent: Node,
        name: string,
        text: string,
        position: Vec3,
        width: number,
        fontSize: number,
        color: Color,
        align: Label.HorizontalAlign = Label.HorizontalAlign.CENTER,
    ): Label {
        const lineCount = Math.max(1, text.split('\n').length);
        const node = this.createNode(name, parent, position, width, (fontSize + 8) * lineCount + 4);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 7;
        label.color = color;
        label.horizontalAlign = align;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.useSystemFont = true;

        const outline = node.addComponent(LabelOutline);
        outline.color = new Color(5, 11, 14, 220);
        outline.width = 2;
        return label;
    }

    public static addPanel(
        parent: Node,
        name: string,
        position: Vec3,
        width: number,
        height: number,
        fill = UI.panel,
        accent = UI.goldSoft,
        radius = 12,
    ): Node {
        const node = this.createNode(name, parent, position, width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = fill;
        graphics.roundRect(-width * 0.5, -height * 0.5, width, height, radius);
        graphics.fill();
        graphics.strokeColor = accent;
        graphics.lineWidth = 2;
        graphics.roundRect(-width * 0.5, -height * 0.5, width, height, radius);
        graphics.stroke();
        return node;
    }

    public static addButton(parent: Node, position: Vec3, options: UiButtonOptions): Node {
        const accent = options.accent ?? UI.gold;
        const node = this.createNode(options.name, parent, position, options.width, options.height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = options.fill ?? new Color(20, 48, 52, 245);
        graphics.roundRect(
            -options.width * 0.5,
            -options.height * 0.5,
            options.width,
            options.height,
            8,
        );
        graphics.fill();
        graphics.strokeColor = accent;
        graphics.lineWidth = 2;
        graphics.roundRect(
            -options.width * 0.5,
            -options.height * 0.5,
            options.width,
            options.height,
            8,
        );
        graphics.stroke();
        graphics.strokeColor = new Color(accent.r, accent.g, accent.b, 55);
        graphics.lineWidth = 1;
        graphics.moveTo(-options.width * 0.38, options.height * 0.24);
        graphics.lineTo(options.width * 0.38, options.height * 0.24);
        graphics.stroke();

        this.addLabel(
            node,
            `${options.name}_Label`,
            options.text,
            new Vec3(),
            options.width - 12,
            options.fontSize ?? 16,
            UI.cream,
        );

        node.on(Node.EventType.TOUCH_END, () => {
            options.onClick();
        });
        return node;
    }

    public static addSprite(
        parent: Node,
        name: string,
        frame: SpriteFrame | null,
        position: Vec3,
        targetWidth: number,
        targetHeight: number,
    ): Sprite | null {
        if (!frame) {
            return null;
        }
        const node = this.createNode(name, parent, position, targetWidth, targetHeight);
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.getComponent(UITransform)?.setContentSize(targetWidth, targetHeight);
        return sprite;
    }

    public static async loadSpriteFrame(path: string): Promise<SpriteFrame | null> {
        return new Promise((resolve) => {
            resources.load(path, SpriteFrame, (error, frame) => {
                if (error || !frame) {
                    console.warn(`[UiFactory] Unable to load ${path}.`, error);
                    resolve(null);
                    return;
                }
                resolve(frame);
            });
        });
    }

    public static clearChildren(node: Node): void {
        [...node.children].forEach((child) => child.destroy());
    }

    public static readableType(type: string): string {
        switch (type) {
            case 'central_court':
                return '中央朝廷';
            case 'player_city':
                return '玩家主城';
            case 'tribe':
                return '幸存者部落';
            case 'city':
                return '城池';
            case 'outpost':
                return '据点';
            default:
                return '未知地点';
        }
    }

    public static readableStatus(status: string): string {
        switch (status) {
            case 'home':
                return '我的主城';
            case 'available':
                return '可进入';
            case 'neutral':
                return '中立';
            case 'locked':
                return '未开放';
            case 'unknown':
                return '未知';
            default:
                return status;
        }
    }
}

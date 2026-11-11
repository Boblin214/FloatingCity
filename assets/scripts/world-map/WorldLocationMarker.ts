import {
    _decorator,
    Color,
    Component,
    EventTouch,
    Graphics,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { UiFactory } from '../ui/UiFactory';
import { WorldLocationDefinition } from './WorldMapTypes';

const { ccclass } = _decorator;

@ccclass('WorldLocationMarker')
export class WorldLocationMarker extends Component {
    public definition: WorldLocationDefinition | null = null;
    public iconHeight = 90;

    private startPoint = new Vec2();
    private selectHandler: ((location: WorldLocationDefinition) => void) | null = null;
    private halo: Graphics | null = null;
    private selected = false;

    public initialize(
        definition: WorldLocationDefinition,
        frame: SpriteFrame | null,
        onSelect: (location: WorldLocationDefinition) => void,
    ): void {
        this.definition = definition;
        this.selectHandler = onSelect;

        const isSpecial = definition.type === 'central_court' || definition.type === 'player_city';
        this.iconHeight = definition.type === 'central_court'
            ? 176
            : definition.type === 'player_city'
                ? 112
                : definition.type === 'city'
                    ? 106
                    : 88;

        const aspect = frame
            ? frame.originalSize.width / Math.max(1, frame.originalSize.height)
            : 1.35;
        const width = Math.max(86, this.iconHeight * aspect);
        const height = this.iconHeight + 34;
        const transform = this.getComponent(UITransform) ?? this.addComponent(UITransform);
        transform.setContentSize(width, height);

        const haloNode = UiFactory.createNode('Halo', this.node, new Vec3(0, -height * 0.22), width, 42);
        this.halo = haloNode.addComponent(Graphics);
        this.paintHalo(isSpecial ? (definition.type === 'central_court' ? UiFactoryColor.gold : UiFactoryColor.jade) : UiFactoryColor.muted);

        const iconNode = UiFactory.createNode('Icon', this.node, new Vec3(0, 8), width, this.iconHeight);
        const sprite = iconNode.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        iconNode.getComponent(UITransform)?.setContentSize(width, this.iconHeight);

        const label = UiFactory.addLabel(
            this.node,
            'Name',
            definition.name,
            new Vec3(0, -height * 0.5 + 2),
            150,
            definition.type === 'central_court' ? 17 : 14,
            definition.type === 'central_court' ? UiFactoryColor.gold : UiFactoryColor.cream,
        );
        label.node.setPosition(new Vec3(0, -this.iconHeight * 0.5 - 18));

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;
        if (!this.halo || !this.definition) {
            return;
        }
        const color = this.definition.type === 'central_court'
            ? UiFactoryColor.gold
            : this.definition.type === 'player_city'
                ? UiFactoryColor.jade
                : UiFactoryColor.muted;
        this.paintHalo(color);
    }

    protected onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private onTouchStart(event: EventTouch): void {
        this.startPoint.set(event.getUILocation());
    }

    private onTouchEnd(event: EventTouch): void {
        const end = event.getUILocation();
        if (Vec2.distance(this.startPoint, end) <= 10 && this.definition) {
            this.selectHandler?.(this.definition);
        }
    }

    private onTouchCancel(): void {
        this.startPoint.set(Vec2.ZERO);
    }

    private paintHalo(color: Color): void {
        if (!this.halo) {
            return;
        }
        this.halo.clear();
        this.halo.fillColor = new Color(color.r, color.g, color.b, this.selected ? 95 : 45);
        this.halo.ellipse(0, 0, 78, 22);
        this.halo.fill();
        this.halo.strokeColor = new Color(color.r, color.g, color.b, this.selected ? 255 : 180);
        this.halo.lineWidth = this.selected ? 4 : 2;
        this.halo.ellipse(0, 0, 65, 17);
        this.halo.stroke();
    }
}

const UiFactoryColor = {
    gold: new Color(239, 194, 99, 255),
    jade: new Color(105, 214, 192, 255),
    cream: new Color(245, 229, 194, 255),
    muted: new Color(178, 184, 164, 255),
};

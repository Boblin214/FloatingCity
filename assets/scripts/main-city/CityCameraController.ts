import { _decorator, Component, EventMouse, EventTouch, Input, Node, Vec2, Vec3, clamp, input } from 'cc';

const { ccclass } = _decorator;

@ccclass('CityCameraController')
export class CityCameraController extends Component {
    public worldRoot: Node | null = null;
    public worldWidth = 1840;
    public worldHeight = 980;
    public viewWidth = 1280;
    public viewHeight = 720;
    public minZoom = 0.78;
    public maxZoom = 1.55;

    private dragging = false;
    private lastPrimary = new Vec2();
    private pinchStartDistance = 0;
    private pinchStartZoom = 1;

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    private onTouchStart(event: EventTouch): void {
        const touches = event.getTouches();
        if (touches.length >= 2) {
            this.dragging = false;
            this.pinchStartDistance = this.distanceBetween(touches[0], touches[1]);
            this.pinchStartZoom = this.currentZoom;
            return;
        }

        this.dragging = true;
        this.lastPrimary.set(event.getUILocation());
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.worldRoot) {
            return;
        }

        const touches = event.getTouches();
        if (touches.length >= 2) {
            const distance = this.distanceBetween(touches[0], touches[1]);
            if (this.pinchStartDistance > 0) {
                this.applyZoom(this.pinchStartZoom * distance / this.pinchStartDistance);
            }
            return;
        }

        if (!this.dragging) {
            return;
        }

        const current = event.getUILocation();
        const deltaX = current.x - this.lastPrimary.x;
        const deltaY = current.y - this.lastPrimary.y;
        this.lastPrimary.set(current);

        const position = this.worldRoot.position;
        this.worldRoot.setPosition(this.clampPosition(
            new Vec3(position.x + deltaX, position.y + deltaY, position.z),
        ));
    }

    private onTouchEnd(event: EventTouch): void {
        const count = event.getTouches().length;
        if (count <= 1) {
            this.dragging = false;
            this.pinchStartDistance = 0;
        }
    }

    private onMouseWheel(event: EventMouse): void {
        const scrollY = event.getScrollY();
        if (Math.abs(scrollY) < 0.01) {
            return;
        }
        this.applyZoom(this.currentZoom * Math.pow(1.0015, scrollY));
    }

    private get currentZoom(): number {
        return this.worldRoot?.scale.x ?? 1;
    }

    private applyZoom(nextZoom: number): void {
        if (!this.worldRoot) {
            return;
        }
        const zoom = clamp(nextZoom, this.minZoom, this.maxZoom);
        this.worldRoot.setScale(new Vec3(zoom, zoom, 1));
        this.worldRoot.setPosition(this.clampPosition(this.worldRoot.position));
    }

    private clampPosition(position: Vec3): Vec3 {
        const zoom = this.currentZoom;
        const limitX = Math.max(0, (this.worldWidth * zoom - this.viewWidth) * 0.5 + 90);
        const limitY = Math.max(0, (this.worldHeight * zoom - this.viewHeight) * 0.5 + 70);
        return new Vec3(
            clamp(position.x, -limitX, limitX),
            clamp(position.y, -limitY, limitY),
            position.z,
        );
    }

    private distanceBetween(first: EventTouch, second: EventTouch): number {
        return Vec2.distance(first.getUILocation(), second.getUILocation());
    }
}

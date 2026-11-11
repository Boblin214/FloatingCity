import { _decorator, Component, EventTouch, Node } from 'cc';

const { ccclass } = _decorator;

export type BuildingSelectHandler = (buildingId: string, node: Node) => void;

@ccclass('BuildingInteraction')
export class BuildingInteraction extends Component {
    public buildingId = '';
    public displayName = '';
    public onSelect: BuildingSelectHandler | null = null;

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
    }

    private handleTouchEnd(event: EventTouch): void {
        event.propagationStopped = true;
        this.onSelect?.(this.buildingId, this.node);
    }
}

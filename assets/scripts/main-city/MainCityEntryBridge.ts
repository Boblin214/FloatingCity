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
    UITransform,
    Vec3,
    input,
} from 'cc';
import { AppNavigator } from '../app/AppNavigator';
import { SceneIds } from '../app/SceneIds';

const { ccclass } = _decorator;

@ccclass('MainCityEntryBridge')
export class MainCityEntryBridge extends Component {
    private backButton: Node | null = null;
    private canvas: Node | null = null;

    protected start(): void {
        const canvas = this.node.getComponent(Canvas) ? this.node : this.node.getChildByName('Canvas');
        if (!canvas) {
            return;
        }
        this.canvas = canvas;
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.createBackButton(canvas);
    }

    protected update(): void {
        if (!this.canvas || !this.backButton?.isValid) {
            return;
        }
        if (this.canvas.getChildByName('MainCity_Hud')) {
            this.backButton.setSiblingIndex(this.canvas.children.length - 1);
            this.enabled = false;
        }
    }

    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private createBackButton(canvas: Node): void {
        const node = new Node('Navigation_ReturnToCourt');
        node.layer = 33554432;
        node.setParent(canvas);
        node.setPosition(new Vec3(-552, 248));
        node.addComponent(UITransform).setContentSize(142, 40);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(8, 24, 30, 230);
        graphics.roundRect(-71, -20, 142, 40, 9);
        graphics.fill();
        graphics.strokeColor = new Color(228, 188, 104, 180);
        graphics.lineWidth = 2;
        graphics.roundRect(-71, -20, 142, 40, 9);
        graphics.stroke();

        const label = new Node('Label');
        label.layer = 33554432;
        label.setParent(node);
        label.addComponent(UITransform).setContentSize(132, 28);
        const text = label.addComponent(Label);
        text.string = '返回中央朝廷';
        text.fontSize = 15;
        text.lineHeight = 20;
        text.color = new Color(246, 229, 193, 255);
        text.useSystemFont = true;

        node.on(Node.EventType.TOUCH_END, () => {
            AppNavigator.go(SceneIds.CentralCourt);
        });
        this.backButton = node;
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.ESCAPE) {
            AppNavigator.back(SceneIds.CentralCourt);
        }
    }
}

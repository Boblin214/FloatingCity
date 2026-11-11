import { Color, Graphics } from 'cc';

export type BuildingKind =
    | 'palace'
    | 'barracks'
    | 'market'
    | 'workshop'
    | 'granary'
    | 'gate'
    | 'tower';

const INK = new Color(24, 31, 42, 255);
const DEEP_INK = new Color(13, 18, 26, 255);
const STONE = new Color(76, 82, 87, 255);
const STONE_LIGHT = new Color(132, 132, 118, 255);
const WINDOW = new Color(255, 202, 102, 255);

function polygon(g: Graphics, points: number[], fill: Color): void {
    g.fillColor = fill;
    g.moveTo(points[0], points[1]);
    for (let index = 2; index < points.length; index += 2) {
        g.lineTo(points[index], points[index + 1]);
    }
    g.close();
    g.fill();
}

function diamond(g: Graphics, centerY: number, width: number, depth: number, fill: Color): void {
    polygon(g, [
        -width * 0.5, centerY,
        0, centerY + depth * 0.5,
        width * 0.5, centerY,
        0, centerY - depth * 0.5,
    ], fill);
}

function outlineDiamond(
    g: Graphics,
    centerY: number,
    width: number,
    depth: number,
    color: Color,
    lineWidth: number,
): void {
    g.strokeColor = color;
    g.lineWidth = lineWidth;
    g.moveTo(-width * 0.5, centerY);
    g.lineTo(0, centerY + depth * 0.5);
    g.lineTo(width * 0.5, centerY);
    g.lineTo(0, centerY - depth * 0.5);
    g.close();
    g.stroke();
}

function roof(
    g: Graphics,
    centerY: number,
    width: number,
    depth: number,
    fill: Color,
    edge: Color,
): void {
    polygon(g, [
        -width * 0.58, centerY,
        0, centerY + depth * 0.75,
        width * 0.58, centerY,
        0, centerY - depth * 0.45,
    ], fill);
    outlineDiamond(g, centerY, width * 1.16, depth * 1.2, edge, 2);
}

function banner(g: Graphics, x: number, y: number, height: number, fill: Color): void {
    g.strokeColor = DEEP_INK;
    g.lineWidth = 3;
    g.moveTo(x, y);
    g.lineTo(x, y + height);
    g.stroke();

    polygon(g, [
        x, y + height,
        x + 18, y + height - 5,
        x + 15, y + height - 31,
        x, y + height - 23,
    ], fill);
}

function windows(g: Graphics, width: number, floorY: number, count: number, rowCount: number): void {
    g.fillColor = WINDOW;
    for (let row = 0; row < rowCount; row++) {
        for (let column = 0; column < count; column++) {
            const step = width / (count + 1);
            const x = -width * 0.5 + step * (column + 1) - 4;
            g.roundRect(x, floorY + row * 24, 8, 13, 2);
            g.fill();
        }
    }
}

function foundation(g: Graphics, width: number, depth: number, accent: Color): void {
    g.fillColor = new Color(5, 11, 16, 78);
    g.ellipse(8, -1, width * 0.56, depth * 0.34);
    g.fill();
    diamond(g, 0, width * 1.08, depth, new Color(48, 56, 62, 255));
    diamond(g, 5, width * 0.94, depth * 0.78, accent);
    outlineDiamond(g, 5, width * 0.94, depth * 0.78, new Color(238, 209, 142, 190), 2);
}

function genericHall(
    g: Graphics,
    width: number,
    height: number,
    accent: Color,
    roofColor: Color,
): void {
    const depth = Math.max(30, width * 0.26);
    foundation(g, width, depth, accent);

    const wallHeight = height * 0.48;
    g.fillColor = new Color(61, 64, 65, 255);
    g.roundRect(-width * 0.43, 9, width * 0.86, wallHeight, 4);
    g.fill();
    g.fillColor = new Color(44, 48, 52, 255);
    polygon(g, [
        width * 0.43, 9,
        width * 0.56, 19,
        width * 0.56, wallHeight + 19,
        width * 0.43, wallHeight + 9,
    ], new Color(43, 47, 51, 255));
    windows(g, width * 0.74, 24, Math.max(2, Math.floor(width / 46)), 2);

    roof(g, wallHeight + 25, width * 0.98, depth * 0.9, roofColor, new Color(35, 38, 40, 255));
    banner(g, -width * 0.34, 14, wallHeight + 34, accent);
    banner(g, width * 0.34, 14, wallHeight + 34, accent);
}

export class CityVisualPainter {
    public static paintBuilding(
        g: Graphics,
        kind: BuildingKind,
        width: number,
        height: number,
        accent: Color,
    ): void {
        g.clear();
        switch (kind) {
            case 'palace':
                CityVisualPainter.paintPalace(g, width, height, accent);
                break;
            case 'gate':
                CityVisualPainter.paintGate(g, width, height, accent);
                break;
            case 'tower':
                CityVisualPainter.paintTower(g, width, height, accent);
                break;
            case 'market':
                genericHall(g, width, height, accent, new Color(42, 101, 99, 255));
                CityVisualPainter.paintAwning(g, width);
                break;
            case 'granary':
                genericHall(g, width, height * 0.94, accent, new Color(142, 91, 50, 255));
                CityVisualPainter.paintSilo(g, width, height);
                break;
            case 'workshop':
                genericHall(g, width, height * 0.92, accent, new Color(72, 88, 102, 255));
                CityVisualPainter.paintChimney(g, width, height);
                break;
            case 'barracks':
            default:
                genericHall(g, width, height, accent, new Color(58, 99, 112, 255));
                break;
        }
    }

    public static paintTree(g: Graphics, width: number, height: number): void {
        g.clear();
        g.fillColor = new Color(6, 15, 16, 70);
        g.ellipse(4, 0, width * 0.37, 8);
        g.fill();
        g.fillColor = new Color(64, 45, 29, 255);
        g.roundRect(-5, 5, 10, height * 0.58, 3);
        g.fill();
        g.fillColor = new Color(39, 76, 65, 255);
        g.circle(-width * 0.16, height * 0.68, width * 0.30);
        g.circle(width * 0.17, height * 0.68, width * 0.27);
        g.circle(0, height * 0.87, width * 0.30);
        g.fill();
        g.fillColor = new Color(80, 124, 94, 180);
        g.circle(-width * 0.08, height * 0.78, width * 0.18);
        g.fill();
    }

    public static paintLantern(g: Graphics): void {
        g.clear();
        g.strokeColor = new Color(26, 29, 33, 255);
        g.lineWidth = 4;
        g.moveTo(0, 0);
        g.lineTo(0, 72);
        g.stroke();
        g.fillColor = new Color(255, 189, 85, 230);
        g.circle(0, 78, 8);
        g.fill();
        g.fillColor = new Color(255, 214, 130, 55);
        g.circle(0, 78, 21);
        g.fill();
    }

    public static paintWall(g: Graphics, width: number, accent: Color): void {
        g.clear();
        g.fillColor = new Color(8, 14, 18, 65);
        g.ellipse(0, -6, width * 0.52, 14);
        g.fill();
        g.fillColor = STONE;
        g.roundRect(-width * 0.5, 0, width, 26, 4);
        g.fill();
        g.fillColor = STONE_LIGHT;
        g.roundRect(-width * 0.49, 22, width * 0.98, 8, 3);
        g.fill();
        for (let x = -width * 0.42; x <= width * 0.42; x += 42) {
            g.fillColor = accent;
            g.roundRect(x - 6, 31, 12, 12, 2);
            g.fill();
        }
    }

    public static paintSelection(g: Graphics, width: number, depth: number): void {
        g.clear();
        g.strokeColor = new Color(255, 221, 139, 238);
        g.lineWidth = 4;
        g.moveTo(-width * 0.57, 0);
        g.lineTo(0, depth * 0.57);
        g.lineTo(width * 0.57, 0);
        g.lineTo(0, -depth * 0.57);
        g.close();
        g.stroke();
        g.strokeColor = new Color(255, 194, 82, 80);
        g.lineWidth = 12;
        g.stroke();
    }

    private static paintPalace(g: Graphics, width: number, height: number, accent: Color): void {
        const depth = width * 0.30;
        foundation(g, width, depth, accent);

        g.fillColor = new Color(90, 72, 58, 255);
        polygon(g, [
            -width * 0.48, 8,
            0, 8 + depth * 0.34,
            width * 0.48, 8,
            0, 8 - depth * 0.34,
        ], new Color(83, 72, 62, 255));

        const tiers = [
            { y: 24, width: 0.91, height: 0.20 },
            { y: 65, width: 0.70, height: 0.24 },
            { y: 112, width: 0.47, height: 0.30 },
        ];

        for (let index = 0; index < tiers.length; index++) {
            const tier = tiers[index];
            const tierWidth = width * tier.width;
            const tierHeight = height * tier.height;
            g.fillColor = new Color(104, 53, 44, 255);
            g.roundRect(-tierWidth * 0.46, tier.y, tierWidth * 0.92, tierHeight, 4);
            g.fill();
            windows(g, tierWidth * 0.74, tier.y + 12, Math.max(2, index + 2), 1);
            roof(
                g,
                tier.y + tierHeight + 15,
                tierWidth,
                Math.max(28, depth * 0.88),
                new Color(119, 49, 40, 255),
                new Color(241, 180, 74, 235),
            );
        }

        g.fillColor = accent;
        g.roundRect(-5, 135, 10, height - 113, 4);
        g.fill();
        g.fillColor = new Color(255, 211, 102, 255);
        g.circle(0, height - 10, 9);
        g.fill();
    }

    private static paintGate(g: Graphics, width: number, height: number, accent: Color): void {
        const depth = 52;
        foundation(g, width, depth, accent);
        g.fillColor = new Color(79, 72, 62, 255);
        g.roundRect(-width * 0.52, 8, width * 1.04, height * 0.54, 5);
        g.fill();
        g.fillColor = new Color(33, 37, 39, 255);
        g.roundRect(-width * 0.18, 8, width * 0.36, height * 0.38, 22);
        g.fill();
        g.fillColor = new Color(47, 43, 40, 255);
        g.rect(-width * 0.15, 8, width * 0.30, height * 0.24);
        g.fill();
        for (const x of [-width * 0.36, width * 0.36]) {
            g.fillColor = new Color(92, 72, 54, 255);
            g.roundRect(x - 24, 36, 48, height * 0.44, 3);
            g.fill();
            roof(g, height * 0.62, 72, 35, new Color(71, 77, 78, 255), accent);
        }
        banner(g, -width * 0.09, 32, height * 0.62, accent);
        banner(g, width * 0.09, 32, height * 0.62, accent);
    }

    private static paintTower(g: Graphics, width: number, height: number, accent: Color): void {
        foundation(g, width, 38, accent);
        g.fillColor = new Color(64, 65, 62, 255);
        polygon(g, [
            -width * 0.28, 10,
            width * 0.28, 10,
            width * 0.20, height * 0.78,
            -width * 0.20, height * 0.78,
        ], new Color(68, 69, 64, 255));
        g.fillColor = new Color(38, 43, 45, 255);
        polygon(g, [
            width * 0.28, 10,
            width * 0.42, 20,
            width * 0.32, height * 0.84,
            width * 0.20, height * 0.78,
        ], new Color(43, 48, 50, 255));
        windows(g, width * 0.44, height * 0.52, 1, 2);
        roof(g, height * 0.82, width * 0.56, 34, accent, new Color(241, 180, 74, 210));
        banner(g, 0, height * 0.88, 34, accent);
    }

    private static paintAwning(g: Graphics, width: number): void {
        g.fillColor = new Color(231, 174, 72, 255);
        for (let x = -width * 0.34; x <= width * 0.30; x += width * 0.13) {
            polygon(g, [
                x, 67,
                x + width * 0.12, 67,
                x + width * 0.10, 48,
                x + width * 0.02, 48,
            ], x < 0 ? new Color(231, 174, 72, 255) : new Color(194, 93, 55, 255));
        }
    }

    private static paintSilo(g: Graphics, width: number, height: number): void {
        g.fillColor = new Color(176, 128, 65, 255);
        g.roundRect(width * 0.19, 34, width * 0.22, height, 8);
        g.fill();
        g.fillColor = new Color(53, 48, 39, 255);
        g.ellipse(width * 0.30, 46, width * 0.11, 9);
        g.fill();
    }

    private static paintChimney(g: Graphics, width: number, height: number): void {
        g.fillColor = new Color(54, 58, 62, 255);
        g.roundRect(width * 0.25, height * 0.43, 18, height * 0.42, 3);
        g.fill();
        g.fillColor = new Color(151, 187, 190, 72);
        g.circle(width * 0.31, height * 0.90, 16);
        g.circle(width * 0.40, height * 1.00, 11);
        g.fill();
    }
}

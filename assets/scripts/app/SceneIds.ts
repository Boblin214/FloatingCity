export const SceneIds = {
    WorldMap: 'WorldMap',
    CentralCourt: 'CentralCourt',
    MainCity: 'MainCity',
} as const;

export type SceneId = typeof SceneIds[keyof typeof SceneIds];

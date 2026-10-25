export interface PresetAvatar {
  id: string;
  url: string;
  label: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "bolt", url: "/avatars/avatar-1.svg", label: "Bolt" },
  { id: "controller", url: "/avatars/avatar-2.svg", label: "Controller" },
  { id: "crown", url: "/avatars/avatar-3.svg", label: "Crown" },
  { id: "skull", url: "/avatars/avatar-4.svg", label: "Skull" },
  { id: "flame", url: "/avatars/avatar-8.svg", label: "Flame" },
];

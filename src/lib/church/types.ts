export const APP_NAME = "Awake the Nations";
export const CHURCH_NAME = "Awake the Nations";
export const CHURCH_CITY = "Goodwood, Cape Town";
export const CHURCH_ADDRESS = "31 Kimberley Street, Townsend Estate, Goodwood, Cape Town";
export const CHURCH_TAGLINE = "Dreams only come true when you are awake.";
export const CHURCH_WEBSITE = "https://zionmatthew.com/";
export const CHURCH_EMAIL = "admin@zionmatthew.com";
export const CHURCH_PHONE = "072 589 1779";
export const CHURCH_PHONE_ALT = "073 493 0893";
export const CHURCH_MAP =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("31 Kimberley Street, Townsend Estate, Goodwood, Cape Town");
export const CHURCH_WHATSAPP = "";
export const CHURCH_VISION =
  "A mandate to open apostolic and prophetic houses called Awake — carrying a prophetic sound to the Body of Christ and raising up the next generation, hub by hub, nation by nation.";

export const LAUNCH_DATE = "2026-09-06";
export const LAUNCH_TIMES = "08:30 or 10:30";
export const SUNDAY_TIME = "09:30";

/** Senior leadership shown on the About/leadership area of the app. */
export const CHURCH_LEADERSHIP = [
  { name: "Zion Matthew", title: "Senior Pastor" },
  { name: "Fedillio Einbeck", title: "Executive Pastor" },
] as const;

export const CORE_VALUES = [
  {
    title: "Being Made New",
    body: "Jesus doesn’t just meet us once — he keeps changing us. There are no experts here, just people growing together.",
  },
  {
    title: "Alive to His Spirit",
    body: "We were made to be filled with the presence of God. A people hungry, expectant in prayer, open to his power.",
  },
  {
    title: "Anchored in Scripture",
    body: "In a world of a thousand voices, we anchor our lives in the living Story of God.",
  },
  {
    title: "Life Together",
    body: "The church is most alive in homes and everyday relationships — known, supported, and formed together in Christ.",
  },
  {
    title: "So Others May Live",
    body: "We exist not just for those already here, but for those still to join. When we scatter, we hope the good news does too.",
  },
  {
    title: "A Heart For The Next",
    body: "Every person, of every age, should feel seen. We are especially focused on reaching and raising kids and teens.",
  },
  {
    title: "No Passengers",
    body: "There are no spectators here. Every gift matters, every act of service builds, and every voice has a place.",
  },
] as const;

export const ROLES = ["pastor", "staff", "volunteer", "member", "child"] as const;
export type Role = (typeof ROLES)[number];

export const AGE_GROUPS = [
  { id: "little_ones", label: "Little Lights", ages: "0–2" },
  { id: "kids", label: "Kids Church", ages: "3–12" },
  { id: "youth", label: "Teens", ages: "13–18" },
  { id: "young_adults", label: "Young adults", ages: "19–30" },
  { id: "adults", label: "Adults", ages: "31–55" },
  { id: "seniors", label: "Seniors", ages: "55+" },
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number]["id"];

export const FUNDS = [
  { id: "general", label: "General fund", blurb: "Sunday worship, staff, and the everyday life of the church." },
  { id: "missions", label: "Missions", blurb: "Local outreach and reaching the nations beyond our walls." },
  { id: "building", label: "Building", blurb: "Care of our home and the rooms still to come." },
  { id: "kids", label: "Kids & teens", blurb: "Kids Church, teens, and a church that feels like wonder." },
] as const;

export const IMAGE_KEYS = [
  "sanctuary",
  "exterior",
  "kids",
  "table",
  "arch",
  "scripture",
  "music",
  "study",
] as const;
export type ImageKey = (typeof IMAGE_KEYS)[number];

export function imageSrc(key: string) {
  const safe = IMAGE_KEYS.includes(key as ImageKey) ? key : "sanctuary";
  return `/images/${safe}.jpg`;
}

export type Person = {
  id: number;
  userId: string | null;
  householdId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  ageGroup: AgeGroup;
  bio: string | null;
  address: string | null;
  birthday: string | null;
  allergies: string | null;
  notes: string | null;
  qrToken: string;
  avatarHue: number;
};

export type Me = Person & {
  isStaff: boolean;
  isOps: boolean;
  displayName: string;
};

export function isStaffRole(role: string) {
  return role === "pastor" || role === "staff";
}
export function isOpsRole(role: string) {
  return role === "pastor" || role === "staff" || role === "volunteer";
}
export function personName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

export type ChurchEvent = {
  id: number;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  visibility: "public" | "members";
  kind: string;
  capacity: number | null;
  ticketCents: number;
  imageKey: string;
  going: number;
  mine: boolean;
};

export type NewsPost = {
  id: number;
  title: string;
  excerpt: string;
  body: string;
  authorName: string;
  publishedAt: string;
  pinned: boolean;
  audience: string;
  imageKey: string;
};

export type Sermon = {
  id: number;
  title: string;
  speaker: string;
  series: string;
  scripture: string;
  preachedAt: string;
  durationSeconds: number;
  description: string;
  imageKey: string;
  transcript: string;
};

export type Team = {
  id: number;
  name: string;
  description: string;
  ministry: string;
  members: { peopleId: number; name: string; seat: string; userId: string | null }[];
  mine: boolean;
};

export type Group = {
  id: number;
  name: string;
  description: string;
  meets: string;
  location: string;
  ageGroup: string | null;
  imageKey: string;
  leaderName: string | null;
  memberCount: number;
  mine: boolean;
};

export type Channel = {
  id: number;
  name: string;
  kind: string;
};

export type ChatMessage = {
  id: number;
  channelId: number;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type Resource = {
  id: number;
  title: string;
  url: string;
  category: string;
  description: string;
  kind: string;
};

export type Contribution = {
  id: number;
  amountCents: number;
  fund: string;
  method: string;
  note: string | null;
  anonymous: boolean;
  recurring: boolean;
  createdAt: string;
};

export type Checkin = {
  id: number;
  childPeopleId: number;
  childName: string;
  age: number | null;
  allergies: string | null;
  qrToken: string;
  serviceLabel: string;
  serviceDate: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  room: string;
  pickupCode: string;
  walkIn: boolean;
};

export type ChildRecord = {
  id: number;
  firstName: string;
  lastName: string;
  birthday: string | null;
  allergies: string | null;
  qrToken: string;
  householdId: number | null;
  notes: string | null;
  parentName: string | null;
};

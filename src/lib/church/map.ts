import type { Person, Role, AgeGroup } from "./types";

export function mapPerson(row: {
  id: number;
  user_id: string | null;
  household_id: number | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  age_group: string;
  bio: string | null;
  address: string | null;
  birthday: string | null;
  allergies: string | null;
  notes: string | null;
  qr_token: string;
  avatar_hue: number;
}): Person {
  return {
    id: row.id,
    userId: row.user_id,
    householdId: row.household_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    role: row.role as Role,
    ageGroup: row.age_group as AgeGroup,
    bio: row.bio,
    address: row.address,
    birthday: row.birthday,
    allergies: row.allergies,
    notes: row.notes,
    qrToken: row.qr_token,
    avatarHue: row.avatar_hue,
  };
}

export function token() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "HL-";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export function pickupCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function splitName(displayName: string | null, email: string | null) {
  const raw = (displayName || email?.split("@")[0] || "Friend").trim();
  const parts = raw.split(/\s+/);
  return {
    first: parts[0] || "Friend",
    last: parts.slice(1).join(" "),
  };
}

export function ageGroupFromBirthday(birthday: string | null): AgeGroup {
  if (!birthday) return "adults";
  const b = new Date(birthday + "T12:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  if (age <= 5) return "little_ones";
  if (age <= 12) return "kids";
  if (age <= 18) return "youth";
  if (age <= 30) return "young_adults";
  if (age <= 55) return "adults";
  return "seniors";
}

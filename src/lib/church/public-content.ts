import type { ChurchEvent, Sermon } from "./types";
import { CHURCH_ADDRESS, CHURCH_LEADERSHIP } from "./types";

function sast(date: string, hour: number, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00+02:00`).toISOString();
}

function plusMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

/** Next N Sundays from today, as YYYY-MM-DD. */
function nextSundays(n: number): string[] {
  const days: string[] = [];
  const d = new Date();
  const add = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + add);
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i * 7);
    days.push(x.toISOString().slice(0, 10));
  }
  return days;
}

export function publicHappenings(): { events: ChurchEvent[]; sermon: Sermon } {
  const [sun1, sun2, sun3] = nextSundays(3);
  const service1 = sast(sun1!, 9, 30);
  const service2 = sast(sun2!, 9, 30);
  const midweek = sast(sun3!, 18, 30);

  const events: ChurchEvent[] = [
    {
      id: 1,
      title: "Sunday gathering · 09:30",
      description: "Worship, prayer, and the Word. Kids' ministry runs throughout the service.",
      location: CHURCH_ADDRESS,
      startsAt: service1,
      endsAt: plusMinutes(service1, 90),
      visibility: "public",
      kind: "sunday",
      capacity: 400,
      ticketCents: 0,
      imageKey: "sanctuary",
      going: 0,
      mine: false,
    },
    {
      id: 2,
      title: "Sunday gathering · 09:30",
      description: "Every Sunday. One gathering, one house, reaching the nations.",
      location: CHURCH_ADDRESS,
      startsAt: service2,
      endsAt: plusMinutes(service2, 90),
      visibility: "public",
      kind: "sunday",
      capacity: 400,
      ticketCents: 0,
      imageKey: "exterior",
      going: 0,
      mine: false,
    },
    {
      id: 3,
      title: "Midweek prayer",
      description: "A midweek gathering to seek God together in prayer.",
      location: CHURCH_ADDRESS,
      startsAt: midweek,
      endsAt: plusMinutes(midweek, 90),
      visibility: "public",
      kind: "midweek",
      capacity: 100,
      ticketCents: 0,
      imageKey: "study",
      going: 0,
      mine: false,
    },
  ];

  const leadPastor = CHURCH_LEADERSHIP[0];

  const sermon: Sermon = {
    id: 1,
    title: "Awake the Nations",
    speaker: leadPastor.name,
    series: "Awake the Nations",
    scripture: "Isaiah 60:1",
    preachedAt: sast(sun1!, 9, 30).slice(0, 10),
    durationSeconds: 1860,
    description: "A word on God's call to rise, shine, and awaken the nations to His presence and power.",
    imageKey: "arch",
    transcript: "",
  };

  return { events, sermon };
}

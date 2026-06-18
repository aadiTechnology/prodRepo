export interface TimeGreeting {
  text: string;
  sub: string;
}

export function getTimeGreeting(hr: number): TimeGreeting {
  if (hr >= 22 || hr < 5)
    return { text: "Good night", sub: "REST WELL & SEE YOU TOMORROW" };
  if (hr < 12)
    return { text: "Good morning", sub: "HAVE A PRODUCTIVE DAY" };
  if (hr < 17)
    return { text: "Good afternoon", sub: "KEEP UP THE GREAT WORK" };
  return { text: "Good evening", sub: "HOPE YOUR DAY WENT WELL" };
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

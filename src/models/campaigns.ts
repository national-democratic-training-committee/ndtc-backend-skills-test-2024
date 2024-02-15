import { Event } from "./events";

export interface Campaign {
  id: string;
  candidates: Candidate;
  events?: Event[] // see models / events
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  district: string;
  office: string;
}

export interface Volunteer {
  id: string;
  name: string;
  role: string;
}

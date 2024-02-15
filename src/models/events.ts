export interface Event {
  id: string;
  name: string;
  // todo: is this different from attendance
  staff: string[];
  attendances?: string[]; // ids for attendances
  moneyRaised: number;
  date: Date;
  startTime: Date;
  endTime: Date;
}

// is linked to campaigns / volunteer - shares an id / name
export interface Attendance {
  id: string;
  name: string;
  contactInfo: string; // assuming this is an email
  interestedInVolunteering: boolean;
  volunteerRoles?: string[]
  donationAmount: number;
}

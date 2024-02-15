import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './dev.env' });

export const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432
});

export const dropTables = async () => {
  try {
    await pool.connect();
    await pool.query('DROP TABLE IF EXISTS attendances CASCADE');
    await pool.query('DROP TABLE IF EXISTS campaigns CASCADE');
    await pool.query('DROP TABLE IF EXISTS events CASCADE');
    await pool.query('DROP TABLE IF EXISTS volunteers CASCADE');
    await pool.query('DROP TABLE IF EXISTS candidates CASCADE');
    console.log('Tables dropped successfully');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

export const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id VARCHAR(36) PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        office VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        staff VARCHAR(255)[],
        attendances VARCHAR(255)[],
        moneyRaised NUMERIC NOT NULL,
        date DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contactInfo VARCHAR(255) NOT NULL,
        interestedInVolunteering BOOLEAN NOT NULL,
        volunteerRoles VARCHAR(255)[],
        donationAmount NUMERIC NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(36) PRIMARY KEY,
        candidate_id VARCHAR(36) REFERENCES candidates(id),
        event_ids VARCHAR(36)[]     
      )
    `);

    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

export const insertCandidatesData = async () => {
  const candidatesData = [
    {
      id: '1',
      firstName: 'Satine',
      lastName: 'Kryze',
      district: 'Mandalore',
      office: 'Mandalor'
    },
    {
      id: '2',
      firstName: 'Mon',
      lastName: 'Mothma',
      district: 'Chandrila',
      office: 'Senator'
    },
    {
      id: '3',
      firstName: 'Padme',
      lastName: 'Amidala',
      district: 'Naboo',
      office: 'Senator'
    }
  ];

  try {
    await Promise.all(candidatesData.map(candidate =>
      pool.query('INSERT INTO candidates(id, firstName, lastName, district, office) VALUES($1, $2, $3, $4, $5)', [candidate.id, candidate.firstName, candidate.lastName, candidate.district, candidate.office])
    ));
    console.log('Candidates data inserted successfully');
  } catch (error) {
    console.error(`Error inserting candidates data :: ${error}`);
    throw error;
  }
};

export const insertVolunteersData = async () => {
  const volunteersData = [
    {
      id: '1',
      name: 'Leia Organa',
      role: 'Volunteer'
    },
    {
      id: '2',
      name: 'Luke Skywalker',
      role: 'Volunteer'
    },
    {
      id: '3',
      name: 'Ashoka',
      role: 'Volunteer'
    }
  ];

  try {
    await Promise.all(volunteersData.map(volunteer =>
      pool.query('INSERT INTO volunteers(id, name, role) VALUES($1, $2, $3)', [volunteer.id, volunteer.name, volunteer.role])
    ));
    console.log('Volunteers data inserted successfully');
  } catch (error) {
    console.error(`Error inserting volunteers data :: ${error}`);
    throw error;
  }
};

export const insertEventsData = async () => {
  const eventsData = [
    {
      id: '1',
      name: 'event 1',
      staff: ["1", "2"],
      attendances: ["1", "2"],
      moneyRaised: 1000,
      date: '2024-02-13',
      startTime: '10:00:00',
      endTime: '11:00:00'
    },
    {
      id: '2',
      name: 'event 2',
      staff: ["1", "2"],
      attendances: ["1", "2"],
      moneyRaised: 1500,
      date: '2024-02-13',
      startTime: '10:00:00',
      endTime: '11:00:00'
    },
    {
      id: '3',
      name: 'event 3',
      staff: ["1", "2"],
      attendances: ["1", "2"],
      moneyRaised: 1500,
      date: '2024-03-05',
      startTime: '10:00:00',
      endTime: '14:00:00'
    }
  ];

  try {
    await Promise.all(eventsData.map(event =>
      pool.query('INSERT INTO events(id, name, staff, moneyRaised, date, startTime, endTime) VALUES($1, $2, $3, $4, $5, $6, $7)',
        [event.id, event.name, event.staff, event.moneyRaised, event.date, event.startTime, event.endTime])
    ));
    console.log('Events data inserted successfully');
  } catch (error) {
    console.error(`Error inserting events data :: ${error}`);
    throw error;
  }
};

export const insertAttendancesData = async () => {
  const attendancesData = [
    {
      id: '1',
      name: 'First Last',
      contactInfo: 'firstlast@email.com',
      interestedInVolunteering: true,
      volunteerRoles: ['volunteer', 'coordinator'],
      donationAmount: 100
    },
    {
      id: '2',
      name: 'Jane Goodall',
      contactInfo: 'janegoodall@email.com',
      interestedInVolunteering: true,
      donationAmount: 100
    },
    {
      id: '3',
      name: 'Jane Doe',
      contactInfo: 'janedoe@email.com',
      interestedInVolunteering: false,
      donationAmount: 1000
    }
  ];

  try {
    await Promise.all(attendancesData.map(attendance =>
      pool.query('INSERT INTO attendances(id, name, contactInfo, interestedInVolunteering, volunteerRoles, donationAmount) VALUES($1, $2, $3, $4, $5, $6)',
        [attendance.id, attendance.name, attendance.contactInfo, attendance.interestedInVolunteering, attendance.volunteerRoles, attendance.donationAmount])
    ));
    console.log('Attendances data inserted successfully');
  } catch (error) {
    console.error(`Error inserting attendances data :: ${error}`);
    throw error;
  }
};

export const insertCampaignsData = async () => {
  const campaignsData = [
    {
      id: '1',
      candidate_id: '1',
      event_ids: ['1', '2']
    },
    {
      id: '2',
      candidate_id: '2',
      event_ids: ['3']
    }
  ];

  try {
    await Promise.all(campaignsData.map(async (campaign) => {
      await pool.query(
        'INSERT INTO campaigns (id, candidate_id, event_ids) VALUES ($1, $2, $3)',
        [campaign.id, campaign.candidate_id, campaign.event_ids]
      );
    }));
    console.log('Campaigns data inserted successfully');
  } catch (error) {
    console.error(`Error inserting campaigns data :: ${error}`);
    throw error;
  }
};

// todo: fix race condition here
export const initializeDatabase = async () => {
  try {
    await Promise.all([
      dropTables(),
      createTables(),
      insertCandidatesData(),
      insertVolunteersData(),
      insertEventsData(),
      insertAttendancesData(),
      insertCampaignsData()
    ]);
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error(`Error initializing :: ${error}`);
    throw error;
  }
};

export const query = async (text: string, values?: any[]) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, values);
    return result.rows;
  } finally {
    client.release();
  }
};

export default pool;

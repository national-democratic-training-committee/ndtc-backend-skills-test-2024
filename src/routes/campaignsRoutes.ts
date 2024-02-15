import express, { Request, Response } from 'express';
import { query } from '../databasepg';

const app = express.Router();

// GET all campaigns
/*
curl http://localhost:3000/v1/campaigns
*/
app.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM campaigns');
    res.json(result);
  } catch (error) {
    console.error(`Error fetching campaigns :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// GET candidates info with aggregate money raised
/*
curl http://localhost:3000/v1/campaigns/money-raised?sort=asc
*/
app.get('/money-raised', async (req: Request, res: Response) => {
  try {
    let sortOrder = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    const queryString = `
      SELECT 
        c.*, 
        cd.firstName, 
        cd.lastName,
        SUM(e.moneyRaised) AS totalMoneyRaised
      FROM campaigns AS c
      JOIN candidates AS cd ON c.candidate_id = cd.id
      LEFT JOIN events AS e ON e.id = ANY(c.event_ids)
      GROUP BY  c.id, cd.id
      ORDER BY totalMoneyRaised ${sortOrder};
    `;
    const result = await query(queryString);
    res.json(result);
  } catch (error) {
    console.error(`Error fetching info :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// GET candidates info with donation money raised
/*
curl http://localhost:3000/v1/campaigns/donations?sort=asc
*/
app.get('/donations', async (req: Request, res: Response) => {
  try {
    let sortOrder = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    const queryString = `
      SELECT 
        c.id AS campaign_id,
        c.candidate_id,
        c.event_ids,
        COALESCE(SUM(a.donationAmount), 0) AS totalDonations
      FROM 
        campaigns AS c,
        unnest(c.event_ids) AS event_id,
        events AS e,
        unnest(e.attendances) AS attend_id
      LEFT JOIN attendances a ON attend_id = a.id
      WHERE e.id = event_id
      GROUP BY c.id, c.candidate_id, c.event_ids
      ORDER BY totalDonations ${sortOrder};
    `;
    const result = await query(queryString);
    res.json(result);
  } catch (error) {
    console.error(`Error fetching info :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// GET candidates info with number of attendees
/*
curl http://localhost:3000/v1/campaigns/attendees?sort=asc
*/
app.get('/attendees', async (req: Request, res: Response) => {
  try {
    let sortOrder = req.query.sort === 'asc' ? 'ASC' : 'DESC';
    const queryString = `
      SELECT 
        c.id AS campaign_id,
        c.candidate_id,
        cd.firstName AS candidate_first_name,
        cd.lastName AS candidate_last_name,
        c.event_ids,
        COUNT(DISTINCT a.attendance_id) AS total_attendees
      FROM campaigns AS c
      LEFT JOIN candidates AS cd ON c.candidate_id = cd.id
      LEFT JOIN unnest(c.event_ids) AS event_id ON true
      LEFT JOIN events e ON e.id = event_id
      LEFT JOIN unnest(e.attendances) AS a(attendance_id) ON true
      GROUP BY c.id, c.candidate_id, cd.firstName, cd.lastName
      ORDER BY total_attendees ${sortOrder};
    `;
    const result = await query(queryString);
    res.json(result);
  } catch (error) {
    console.error(`Error fetching info :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

export default app;

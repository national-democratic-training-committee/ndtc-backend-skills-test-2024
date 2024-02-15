import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '../models/events';
import { query } from '../databasepg';

const app = express.Router();

// GET all events
/*
curl http://localhost:3000/v1/events
*/
app.get('/', async (req: Request, res: Response) => {
  try {
    const eventsQueryResult = await query('SELECT * FROM events', []);
    const events: Event[] = eventsQueryResult;
    res.json(events);
  } catch (error) {
    console.error(`Error fetching events :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// POST a event
/*
curl -X POST http://localhost:3000/v1/events -H "Content-Type: application/json" -d '{\"name\":\"name\", \"staff\": [\"1\", \"2\"], \"moneyRaised\": 1000, \"date\": \"2024-02-20\", \"startTime\": \"9:00:00\", \"endTime\": \"12:00:00\"}' 
*/
app.post('/', async (req: Request, res: Response) => {
  const { name, staff, moneyRaised, date, startTime, endTime } = req.body;
  const id = uuidv4();
  const newEvent: Event = { id, name, staff, moneyRaised, date, startTime, endTime };
  
  try {
    await query('INSERT INTO events (id, name, staff, moneyRaised, date, startTime, endTime) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, name, staff, moneyRaised, date, startTime, endTime]);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error(`Error adding new event :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// Update an event by ID
/*
curl -X PATCH http://localhost:3000/v1/events/<id> -H "Content-Type: application/json" -d '{\"date\": \"2024-03-14\"}'
*/
app.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, staff, moneyRaised, date, startTime, endTime } = req.body;

  try {
    // Check if the event exists
    const existingEventResult: any = await query('SELECT * FROM events WHERE id = $1', [id]);
    const existingEvent: Event | undefined = existingEventResult[0];
    
    if (!existingEvent) {
      return res.status(404).json({ message: `Event with id ${id} not found` });
    }

    // Update only the provided fields
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name');
      updateValues.push(name);
    }
    if (staff !== undefined) {
      updateFields.push('staff');
      updateValues.push(staff);
    }
    if (moneyRaised !== undefined) {
      updateFields.push('moneyRaised');
      updateValues.push(moneyRaised);
    }
    if (date !== undefined) {
      updateFields.push('date');
      updateValues.push(date);
    }
    if (startTime !== undefined) {
      updateFields.push('startTime');
      updateValues.push(startTime);
    }
    if (endTime !== undefined) {
      updateFields.push('endTime');
      updateValues.push(endTime);
    }

    // Construct the update query
    const updateQuery = `UPDATE events SET ${updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ')} WHERE id = $${updateFields.length + 1}`;

    // Execute the update query
    await query(updateQuery, [...updateValues, id]);

    res.json({ id, ...req.body });
  } catch (error) {
    console.error(`Error updating event with ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

export default app;

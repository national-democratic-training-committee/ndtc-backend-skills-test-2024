import express, { Request, Response } from 'express';
import { query } from '../databasepg';
import { v4 as uuidv4 } from 'uuid';
import { Attendance } from '../models/events';

const app = express.Router();

// GET all attendance records
/*
curl http://localhost:3000/v1/attendances
*/
app.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM attendances');
    res.json(result);
  } catch (error) {
    console.error(`Error fetching attendance :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// POST a new attendance record
/*
curl -X POST http://localhost:3000/v1/attendances -H "Content-Type: application/json" -d '{\"name\": \"First Last\", \"contactInfo\": \"email@email.com\", \"interestedInVolunteering\": true, \"donationAmount\": 1000}'
*/
app.post('/', async (req: Request, res: Response) => {
  const { name, contactInfo, interestedInVolunteering, donationAmount } = req.body;
  const id = uuidv4();

  try {
    const insertQuery = 'INSERT INTO attendances (id, name, contactInfo, interestedInVolunteering, donationAmount) VALUES ($1, $2, $3, $4, $5)';
    const result = await query(insertQuery, [id, name, contactInfo, interestedInVolunteering, donationAmount]);
    res.status(201).json({message: "Attendance created successfully"});
  } catch (error) {
    console.error(`Error adding new attendance record :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// PATCH an attendance record by ID
/*
curl -X PATCH http://localhost:3000/v1/attendances/2 -H "Content-Type: application/json" -d '{\"interestedInVolunteering\": true}'
*/
app.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, contactInfo, interestedInVolunteering, donationAmount } = req.body;

  try {
    const existingAttendance = await query('SELECT * FROM attendances WHERE id = $1', [id]);

    if (existingAttendance.length === 0) {
      return res.status(404).json({ message: `Attendance record with id ${id} not found` });
    }

    let updateQuery = 'UPDATE attendances SET ';
    const updateValues = [];
    const updateFields = [];

    if (name !== undefined) {
      updateFields.push('name');
      updateValues.push(name);
    }
    if (contactInfo !== undefined) {
      updateFields.push('contactInfo');
      updateValues.push(contactInfo);
    }
    if (interestedInVolunteering !== undefined) {
      updateFields.push('interestedInVolunteering');
      updateValues.push(interestedInVolunteering);
    }
    if (donationAmount !== undefined) {
      updateFields.push('donationAmount');
      updateValues.push(donationAmount);
    }

    updateQuery += updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    updateQuery += ` WHERE id = $${updateValues.length + 1}`;

    const updateParams = [...updateValues, id];

    await query(updateQuery, updateParams);

    res.json({ id, name, contactInfo, interestedInVolunteering, donationAmount });
  } catch (error) {
    console.error(`Error updating attendance record with ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

export default app;

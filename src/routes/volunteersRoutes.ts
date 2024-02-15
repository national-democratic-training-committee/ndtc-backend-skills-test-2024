import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Volunteer } from '../models/campaigns';
import { query } from '../databasepg'; 

const app = express.Router();

// todo: replace with nosql db
const volunteersFilePath = path.join(__dirname, '..', '..', 'localdb', 'volunteers.json');

// GET all volunteers
// curl http://localhost:3000/v1/volunteers
app.get('/', async (_: Request, res: Response) => {
  try {
    const queryResult = await query('SELECT * FROM volunteers', []);
    const volunteers: Volunteer[] = queryResult;
    res.status(200).json(volunteers);
  } catch (error) {
    console.error(`Error fetching all volunteers :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// GET volunteer by id
// curl http://localhost:3000/v1/volunteers/<id>
app.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const queryResult = await query('SELECT * FROM volunteers WHERE id = $1', [id]);
    const volunteer: Volunteer = queryResult[0];
    if (!volunteer) {
      return res.status(404).json({ message: `Volunteer with id ${id} not found` });
    }
    res.status(200).json(volunteer);
  } catch (error) {
    console.error(`Error fetching volunteer with id ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// POST new volunteer
/*
curl -X POST http://localhost:3000/v1/volunteers -H "Content-Type: application/json" -d '{\"name\": \"name\", \"role\": \"volunteer\"}'
*/
// todo: add helper function to double check input body and return sensible message
app.post('/', async (req: Request, res: Response) => {
  const { name, role } = req.body;
  const id = uuidv4();
  const newVolunteer: Volunteer = { id, name, role };

  try {
    await query('INSERT INTO volunteers (id, name, role) VALUES ($1, $2, $3)', [id, name, role]);
    res.status(201).json(newVolunteer);
  } catch (error) {
    console.error(`Error adding new volunteer :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// Batch POST volunteers
/*
curl http://localhost:3000/volunteers/v1/batch-post -X POST -H "Content-Type: application/json" -d '[{\"name\": \"First Last\", \"role\": \"Volunteer\"}, {\"name\": \"First Last\", \"role\": \"Volunteer\"}]'
*/
app.post('/batch-post', async (req: Request, res: Response) => {
  try {
    const newVolunteers: Volunteer[] = req.body;
    if (!Array.isArray(newVolunteers)) {
      return res.status(400).json({ message: 'Request body is invalid, should be an array' });
    }

    const addedIds: string[] = [];
    for (const volunteer of newVolunteers) {
      const id = uuidv4();
      addedIds.push(id);
      await query('INSERT INTO volunteers (id, name, role) VALUES ($1, $2, $3)', [id, volunteer.name, volunteer.role]);
    }
    
    res.status(201).json({ message: `Volunteers added successfully with ids ${addedIds.join(', ')}` });
  } catch (error) {
    console.error(`Error batch adding volunteers :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// PATCH volunteer by id
/*
curl -X PATCH http://localhost:3000/v1/volunteers/:id -H "Content-Type: application/json" -d '{\"name\": \"new name\", \"role\": \"Coordinator\"}'
*/
app.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { campaignId, name, role } = req.body;

  try {
    const existingVolunteerResult = await query('SELECT * FROM volunteers WHERE id = $1', [id]);

    if (existingVolunteerResult.length === 0) {
      return res.status(404).json({ message: `Volunteer with id ${id} not found` });
    }

    let updateQuery = 'UPDATE volunteers SET ';
    const updateValues = [];
    const updateFields = [];

    if (campaignId !== undefined) {
      updateFields.push('campaign_id');
      updateValues.push(campaignId);
    }
    if (name !== undefined) {
      updateFields.push('name');
      updateValues.push(name);
    }
    if (role !== undefined) {
      updateFields.push('role');
      updateValues.push(role);
    }

    updateQuery += updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    updateQuery += ` WHERE id = $${updateValues.length + 1}`;

    const updateParams = [...updateValues, id];

    await query(updateQuery, updateParams);

    res.json({ id, campaignId, name, role });
  } catch (error) {
    console.error(`Error updating volunteer with id ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// DELETE volunteer by id
/*
curl -X DELETE http://localhost:3000/v1/volunteers/:id
*/
app.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM volunteers WHERE id = $1', [id]);
    res.status(200).json({ message: `Volunteer with id ${id} deleted successfully` });
  } catch (error) {
    console.error(`Error deleting volunteer with id ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

export default app;

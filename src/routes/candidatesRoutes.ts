import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Candidate } from '../models/campaigns';
import { query } from '../databasepg';

const app  = express.Router();

// GET all candidates
/*
curl http://localhost:3000/v1/candidates
*/
app.get('/', async (_: Request, res: Response) => {
  try {
    const queryResult = await query('SELECT * FROM candidates', []);
    const candidates: Candidate[] = queryResult;
    res.status(200).json(candidates);
  } catch (error) {
    console.error(`Error fetching all candidates :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// GET candidate by id
/*
curl http://localhost:3000/v1/candidates/:id
*/
app.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const queryResult = await query('SELECT * FROM candidates WHERE id = $1', [id]);
    const candidate: Candidate = queryResult[0];
    if (!candidate) {
      return res.status(404).json({ message: `Candidate with id ${id} not found` });
    }
    res.status(200).json(candidate);
  } catch (error) {
    console.error(`Error fetching Candidate with id ${id}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// batch GET candidates with array of ids
/*
curl -X POST http://localhost:3000/v1/candidates/batch-fetch -H "Content-Type: application/json" -d '["1", "2"]'
*/
app.post('/batch-fetch', async (req: Request, res: Response) => {
  const batchIds: string[] = req.body;
  try {
    const queryResult = await query('SELECT * FROM candidates WHERE id = ANY($1)', [batchIds]);
    const batchCandidates: Candidate[] = queryResult;
    res.json(batchCandidates);
  } catch (error) {
    console.error(`Error fetching batch candidates :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// POST new candidate
/*
curl -X POST http://localhost:3000/v1/candidates -H "Content-Type: application/json" -d '{\"firstName\": \"firstName\", \"lastName\": \"lastName\", \"district\": \"District Name\", \"office\": \"Office Name\"}'
*/
app.post('/', async (req: Request, res: Response) => {
  const { firstName, lastName, district, office } = req.body;
  const id = uuidv4();

  try {
    await query('INSERT INTO candidates(id, firstName, lastName, district, office) VALUES($1, $2, $3, $4, $5)', [id, firstName, lastName, district, office]);
    res.status(201).json({ message: "Sucessfully added candidate" });
  } catch (error) {
    console.error(`Error adding new candidate :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// PATCH candidate by id
/*
curl -X PATCH http://localhost:3000/v1/candidates/2 -H "Content-Type: application/json" -d '{\"office\": \"New Office\"}' 
*/
app.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, district, office } = req.body;

  try {
    const existingCandidate = await query('SELECT * FROM candidates WHERE id = $1', [id]);

    if (existingCandidate.length === 0) {
      return res.status(404).json({ message: `Candidate with id ${id} not found` });
    }

    let updateQuery = 'UPDATE candidates SET ';
    const updateValues = [];
    const updateFields = [];

    if (firstName !== undefined) {
      updateFields.push('firstName');
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push('lastName');
      updateValues.push(lastName);
    }
    if (district !== undefined) {
      updateFields.push('district');
      updateValues.push(district);
    }
    if (office !== undefined) {
      updateFields.push('office');
      updateValues.push(office);
    }

    updateQuery += updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    updateQuery += ` WHERE id = $${updateValues.length + 1}`;

    const updateParams = [...updateValues, id];

    await query(updateQuery, updateParams);

    res.json({ id, firstName, lastName, district, office });
  } catch (error) {
    console.error(`Error updating candidate with id ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

// DELETE candidate by id
/*
curl -X DELETE http://localhost:3000/v1/candidates/:id
*/
app.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM candidates WHERE id = $1', [id]);
    res.status(201).json({ message: `Candidate with ${id} deleted successfully` });
  } catch (error) {
    console.error(`Error deleting candidate with ${id} :: ${error}`);
    res.status(500).json({ message: 'There was a server error' });
  }
});

export default app;

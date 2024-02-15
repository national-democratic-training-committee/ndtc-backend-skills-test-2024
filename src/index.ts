import express, { Request, Response, NextFunction, Send } from 'express';

import candidatesRoutes from './routes/candidatesRoutes'
import volunteersRoutes from './routes/volunteersRoutes'
import eventsRoutes from './routes/eventsRoutes'
import attendancesRoutes from './routes/attendancesRoutes'
import campaignsRoutes from './routes/campaignsRoutes'

import { initializeDatabase } from './databasepg';

const app = express();
const PORT = 3000;

app.use(express.json());

const stdTTL: number = 1 * 60 * 1000; // 5 minutes, m * s * ms
const cache: { [key: string]: any } = {};

// todo: add timeout to cache
const apiCache = (req: Request, res: Response, next: NextFunction): void => {
  const key: string = req.originalUrl || req.url;

  if (cache[key]) {
    console.log(`Found item in cache :: ${key}`);
    res.json(cache[key]);
  } else {
    console.log(`Writing to cache :: ${key}`);
    const sendResponse: any = res.json;
    res.json = (body: any): Response<any, Record<string, any>> => {
      cache[key] = body;
      return sendResponse.call(res, body);
    };
    next();
  }
};

app.use(apiCache);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello 👋');
});

// Routes
app.use('/v1/candidates', candidatesRoutes);
app.use('/v1/volunteers', volunteersRoutes);
app.use('/v1/events', eventsRoutes);
app.use('/v1/attendances', attendancesRoutes);
app.use('/v1/campaigns', campaignsRoutes);

// catch-all for routes that don't exist
app.use((req, res, _) => {
  const message = `Route not found :: ${req.method} ${req.originalUrl}`;
  res.status(404).send(message);
});

// uncomment to create tables and add data
//initializeDatabase();

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

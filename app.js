import Fastify from 'fastify'
import {
    Sequelize,
    DataTypes
} from 'sequelize';
import fastifyCors from '@fastify/cors';
import Redis from 'ioredis'

const redis = new Redis();


const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    // logging: false
});

const Candidate = sequelize.define('Candidate', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    district: {
        type: DataTypes.STRING,
        allowNull: false
    },
    office: {
        type: DataTypes.STRING,
        allowNull: false
    },
},
{
    indexes: [
        {
            unique: true,
            fields: ['firstName', 'lastName', 'district', 'office']
        }
    ]
});

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    }
});

const Volunteer = sequelize.define('Volunteer', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const VolunteerCandidate = sequelize.define('VolunteerCandidate', {}, {
    indexes: [{
        unique: true,
        fields: ['candidateId', 'volunteerId']
    }]
});

const VolunteerRole = sequelize.define('VolunteerRole', {}, {
    indexes: [{
        unique: true,
        fields: ['volunteerId', 'roleId']
    }]
});
VolunteerRole.primaryKey = ['volunteerId', 'roleId'];

const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    moneyRaised: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false
    }
});

const VolunteerEvent = sequelize.define('VolunteerEvent', {
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    indexes: [{
        unique: true,
        fields: ['eventId', 'volunteerId']
    }]
});

const Attendee = sequelize.define('Attendee', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    contactInfo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isInterestedInVolunteering: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    donationAmount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    interestedVolunteerRoleId: {
        type: DataTypes.INTEGER
    }
});

const EventAttendee = sequelize.define('EventAttendee', {
    indexes: [{
        unique: true,
        fields: ['attendeeId', 'eventId']
    }]
});

Candidate.belongsToMany(Volunteer, {
    through: VolunteerCandidate,
    foreignKey: 'candidateId',
    otherKey: 'volunteerId'
});

Role.belongsToMany(Volunteer, {
    through: VolunteerRole
});

Volunteer.belongsToMany(Candidate, {
    through: VolunteerCandidate,
    foreignKey: 'volunteerId',
    otherKey: 'candidateId'
});

VolunteerCandidate.belongsTo(Volunteer, { foreignKey: 'volunteerId' });
VolunteerCandidate.belongsTo(Candidate, { foreignKey: 'candidateId' });

Volunteer.hasMany(VolunteerCandidate, { foreignKey: 'volunteerId' });
Candidate.hasMany(VolunteerCandidate, { foreignKey: 'candidateId' });


Volunteer.belongsToMany(Role, {
    through: VolunteerRole,
    as: 'Roles'
});

Event.belongsToMany(Volunteer, {
    through: VolunteerEvent
});
Volunteer.belongsToMany(Event, {
    through: VolunteerEvent
});

Role.hasOne(Attendee, {
    foreignKey: 'interestedVolunteerRoleId'
});


Event.belongsToMany(Attendee, {
    through: EventAttendee
});
Attendee.belongsToMany(Event, {
    through: EventAttendee
});

sequelize.sync({
        force: true
    })
    .then(() => console.log('Database & tables created!'))
    .catch((error) => console.error('An error occurred while syncing the database:', error));

const fastify = Fastify({
    logger: true
})

async function dbConnectorPlugin(fastify) {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        fastify.decorate('sequelize', sequelize);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

fastify.decorate('redis', redis);
fastify.register(dbConnectorPlugin);
fastify.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
    maxAge: 86400
});


fastify.get('/', function (request, reply) {
    reply.send({
        hello: 'world'
    })
})

fastify.post('/candidate', async (request, response) => {
    const candidateData = request.body;
    if (!candidateData.firstName || !candidateData.lastName || !candidateData.district || !candidateData.office) {
        return response.status(400).send({
            error: 'Bad Request: Missing required fields'
        });
    }
    try {
        const candidate = await sequelize.models.Candidate.create(candidateData);
        response.code(201).send(candidate);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            return response.status(409).send({
                error: 'Conflict: Candidate already exists'
            });
        }
        console.error('ERROR: creating candidate:', error);
        response.status(500).send({
            error: 'Failed to create candidate'
        });
    }
});

fastify.get('/candidate/:id', async (request, response) => {
    try {
        const {
            id
        } = request.params;
        const candidate = await sequelize.models.Candidate.findByPk(id);
        if (candidate) {
            response.code(200).send(candidate);
        } else {
            response.code(404).send({
                error: 'Candidate not found'
            });
        }
    } catch (error) {
        console.error('ERROR: finding a single candidate:', error);
        response.code(500).send({
            error: 'Failed to retrieve candidate'
        });
    }
});

fastify.get('/candidates', async (request, response) => {
    try {
        const { office, district, order } = request.query;
        const queryOptions = {
            order: [],
            where: {}
        };
        if (office) {
            queryOptions.where.office = office;
        }
        if (district) {
            queryOptions.where.district = district;
        }
        if (order) {
            const orderDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            queryOptions.order.push(['office', orderDirection]);
            queryOptions.order.push(['district', orderDirection]);
        } else {
            queryOptions.order.push(['office', 'ASC']);
            queryOptions.order.push(['district', 'ASC']);
        }
        const candidates = await sequelize.models.Candidate.findAll(queryOptions);
        response.code(200).send(candidates);
    } catch (error) {
        console.error('Error processing request:', error);
        response.code(500).send({
            error: 'Failed to retrieve candidates'
        });
    }
});
fastify.post('/role', async (request, response) => {
    const roleData = request.body;
    if (!roleData.name) {
        return response.status(400).send({
            error: 'Bad Request: Missing required field "name"'
        });
    }
    try {
        const role = await sequelize.models.Role.create(roleData);
        response.code(201).send(role);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            return response.status(409).send({
                error: 'Conflict: Role already exists'
            });
        }
        console.error('ERROR: creating role:', error);
        response.status(500).send({
            error: 'Failed to create role'
        });
    }
});


fastify.post('/volunteer', async (request, response) => {
    try {
        const volunteerData = request.body;
        const {name, roleId, candidateId} = volunteerData;
        const volunteer = await sequelize.models.Volunteer.create(volunteerData);
        const candidate = await sequelize.models.Candidate.findByPk(candidateId);
        if (!candidate) {
            return response.code(404).send({
                error: 'Candidate not found'
            });
        }
        return response.code(201).send(volunteer);
    }   
    catch (error) {
        console.error('ERROR: creating volunteer:', error);
        response.code(500).send({
            error: 'Failed to create a volunteer'
        });
    }
});

fastify.get('/volunteer/:id', async (request, response) => {
    try {
        const { id } = request.params;
        const volunteer = await sequelize.models.Volunteer.findByPk(id);
        if (volunteer) {
            response.code(200).send(volunteer);
        } else {
            response.code(404).send({
                error: 'Volunteer not found'
            });
        }
    } catch (error) {
        console.error('Error processing request:', error);
        response.code(500).send({
            error: 'Failed to retrieve volunteer'
        });
    }
});
fastify.get('/volunteers', async (request, response) => {
    try {
        const { name, order } = request.query;
        const queryOptions = {
            where: {},
            order: [],
        };
        if (name) {
            queryOptions.where.name = name;
        }

        if (order) {
            const orderDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            queryOptions.order.push([order, orderDirection]);
        } else {
            queryOptions.order.push(['name', 'ASC']);
        }

        const volunteers = await sequelize.models.Volunteer.findAll(queryOptions);

        response.code(200).send(volunteers);
    } catch (error) {
        console.error('Error processing request:', error);
        response.code(500).send({
            error: 'Failed to retrieve volunteers'
        });
    }
});

fastify.put('/volunteer/:id', async (request, response) => {
    try {
        const { id } = request.params;
        const { candidateId } = request.body;
        
        const volunteer = await sequelize.models.Volunteer.findByPk(id);

        if (!volunteer) {
            return response.code(404).send({
                error: 'Volunteer not found'
            });
        }

        const candidate = await sequelize.models.Candidate.findByPk(candidateId);

        if (!candidate) {
            return response.code(404).send({
                error: 'Candidate not found'
            });
        }

        await volunteer.setCandidate(candidate);

        return response.code(200).send({
            message: 'Volunteer association updated successfully.'
        });
    } catch (error) {
        console.error('ERROR: updating volunteer:', error);
        response.code(500).send({
            error: 'ERROR: Failed to update volunteer association'
        });
    }
});

fastify.post('/event', async (request, response) => {
    const eventData = request.body;
    if (!eventData.moneyRaised || !eventData.date || !eventData.startTime || !eventData.endTime) {
        return response.status(400).send({
            error: 'Bad Request: Missing required fields'
        });
    }
    try {
        const event = await sequelize.models.Event.create(eventData);
        response.code(201).send(event);
    } catch (error) {
        console.error('ERROR: creating event:', error);
        response.status(500).send({
            error: 'Failed to create event'
        });
    }
});

fastify.get('/event', async (request, response) => {
    const cachedEvents = await fastify.redis.get('events');
    if (cachedEvents) {
        return response.send(JSON.parse(cachedEvents));
    }
    try {
        const events = await sequelize.models.Event.findAll();
        await fastify.redis.set('events', JSON.stringify(events), 'EX',  60); 
        response.send(events);
    } catch (error) {
        console.error('ERROR: retrieving events:', error);
        response.status(500).send({
            error: 'Failed to retrieve events'
        });
    }
});



fastify.listen({
    port: 3000
}, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
})
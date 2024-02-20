import Fastify from 'fastify'
import {
    Sequelize,
    DataTypes
} from 'sequelize';
import fastifyCors from '@fastify/cors';
import Keyv from 'keyv'
import caching from '@fastify/caching';

const keyv = new Keyv('redis://localhost:6379');

// TODO: Refactor Sequleize section to other place

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    // logging: false
});
// TODO: Remove later
sequelize.drop().then(() => {
    console.log('Database has been dropped.');
}).catch((error) => {
    console.error('An error occurred while dropping the database:', error);
});

const Candidate = sequelize.define('Candidate', {
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    district: DataTypes.STRING,
    office: DataTypes.STRING,
});

const Volunteer = sequelize.define('Volunteer', {
    name: DataTypes.STRING
});

Candidate.belongsToMany(Volunteer, { through: 'VolunteerCandidate' });
Volunteer.belongsToMany(Candidate, { through: 'VolunteerCandidate' });

const Role = sequelize.define('Role', {
    name: DataTypes.STRING,
    description: DataTypes.TEXT
});

Volunteer.belongsToMany(Role, { through: "VolunteerRole" });
Role.belongsToMany(Volunteer, { through: "VolunteerRole" });

const Event = sequelize.define('Event', {
    moneyRaised: DataTypes.INTEGER,
    date: DataTypes.DATEONLY,
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    staff: DataTypes.ARRAY(DataTypes.INTEGER)
});

Volunteer.belongsToMany(Event, { through: "EventVolunteer" });
Event.belongsToMany(Volunteer, { through: "EventVolunteer" });

const Attendee = sequelize.define('Attendee', {
    name: DataTypes.STRING,
    contactInfo: DataTypes.TEXT,
    isInterestedInVolunteering: DataTypes.BOOLEAN,
    donationAmount: DataTypes.FLOAT,
    interestedVolunteerRole: DataTypes.TEXT,
});

Attendee.belongsToMany(Event, { through: "EventAttendee" });
Event.belongsToMany(Attendee, { through: "EventAttendee" });

sequelize.sync({
    force: true
})
    .then(() => console.log('Database & tables created!'))
    .catch((error) => console.error('An error occurred while syncing the database:', error));

const fastify = Fastify({
    logger: true
});

async function dbConnectorPlugin(fastify) {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        fastify.decorate('sequelize', sequelize);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

fastify.register(caching, { cache: keyv });
fastify.register(dbConnectorPlugin);
fastify.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
    maxAge: 86400
});

const postErrorConflict = (error, response, name) => {
    console.error(`ERROR: Creating ${name}:`, error);
    if (error instanceof Sequelize.UniqueConstraintError) {
        return response.status(409).send({
            error: `Conflict: ${name} already exists`
        });
    };
    response.code(500).send({
        error: 'Failed to create a volunteer'
    });
};

fastify.post('/candidate', async (request, response) => {
    const candidateData = request.body;
    const { firstName, lastName, district, office } = candidateData
    if (!firstName || !lastName || !district || !office) {
        return response.status(400).send({
            error: 'Bad Request: Missing Required Fields'
        });
    };
    try {
        const candidate = await sequelize.models.Candidate.create(candidateData);
        response.code(201).send(candidate);
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            return response.status(409).send({
                error: 'Conflict: Candidate already exists'
            });
        };
        console.error('ERROR: creating candidate:', error);
        response.status(500).send({
            error: 'Failed to create candidate'
        });
    };
});

fastify.put('/candidate/:id', async (request, reply) => {
    const { id } = request.params;
    const updateData = request.body;
    try {
        const candidate = await sequelize.models.Candidate.findByPk(id);
        if (!candidate) {
            console.error('Candidate not found:', id);
            return reply.code(404).send({
                error: 'Candidate not found'
            });
        };
        const updatedCandidate = candidate.update(updateData);
        const cacheKey = `candidate-${id}`;
        await fastify.cache.delete(cacheKey);
        await fastify.cache.delete('candidates');
        return updatedCandidate;
    } catch (error) {
        console.error('Error updating candidate:', error);
        reply.code(500).send({
            error: 'Failed to update candidate'
        });
    }
});
fastify.get('/candidate/:id', async (request, response) => {
    const cacheKey = `candidate-${JSON.stringify(request.query)}`;
    const { id } = request.params;

    try {
        const cachedResponse = await fastify.cache.get(cacheKey);
        if (cachedResponse) {
            return response.code(200).send(cachedResponse);
        }
    }
    catch (error) {
        console.error("ERROR with the cache: ", error)
        const candidate = await sequelize.models.Candidate.findByPk(id);
        return response.code(200).send(candidate);
    }
    try {
        const candidate = await sequelize.models.Candidate.findByPk(id);
        await fastify.cache.set(cacheKey, candidate, 3600);
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
    };
});

fastify.get('/candidates', async (request, response) => {
    const { order, ...filters } = request.query;
    const queryOptions = {
        order: [],
        where: filters,
        include: Volunteer
    };
    if (order) {
        const orderDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        queryOptions.order.push(['office', orderDirection]);
        queryOptions.order.push(['district', orderDirection]);
    } else {
        queryOptions.order.push(['office', 'ASC']);
        queryOptions.order.push(['district', 'ASC']);
    }
    const queryOptionsString = JSON.stringify(queryOptions);
    const cacheKey = `candidates-${queryOptionsString}`;
    const cachedResponse = await fastify.cache.get(cacheKey);
    if (cachedResponse) {
        console.log("🚀 ~ fastify.get ~ cachedResponse:", cachedResponse)
        return cachedResponse;
    }
    try {
        const candidates = await sequelize.models.Candidate.findAll(queryOptions);
        console.log("🚀 ~ fastify.get ~ candidates:", candidates)
        await fastify.cache.set(cacheKey, candidates, 60 * 60);
        return response.code(200).send(candidates);
    } catch (error) {
        console.error('Error processing candidates request:', error);
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
        postErrorConflict(error, response, "Role");
    }
});

fastify.get('/roles', async (request, response) => {
    const { order, ...filters } = request.query;
    const cacheKey = `roles`;

    try {
        const cachedRoles = await fastify.cache.get(cacheKey);
        if (cachedRoles) {
            return response.code(200).send(cachedRoles);
        }
    } catch (error) {
        console.error("ERROR with the cache: ", error);
    }

    try {
        const roles = await sequelize.models.Role.findAll();
        await fastify.cache.set(cacheKey, roles, 60);
        return response.code(200).send(roles);
    } catch (error) {
        console.error('Error retrieving roles:', error);
        return response.code(500).send({
            error: 'Failed to retrieve roles'
        });
    }
});

fastify.put('/role/:id', async (request, response) => {
    const { id } = request.params;
    const updatedData = request.body;
    const cacheKey = `role-${id}`;

    try {
        const role = await sequelize.models.Role.findByPk(id);
        if (!role) {
            return response.code(404).send({
                error: 'Role not found'
            });
        }
        await role.update(updatedData);
        await fastify.cache.delete(cacheKey);
        await fastify.cache.delete('roles');
        return response.code(200).send({
            message: 'Role updated successfully',
            role: role
        });
    } catch (error) {
        console.error('ERROR: updating role:', error);
        response.code(500).send({
            error: 'Failed to update role'
        });
    }
});
fastify.get('/role/:id', async (request, response) => {
    const { id } = request.params;
    const cacheKey = `role-${id}`;

    try {
        const cachedRole = await fastify.cache.get(cacheKey);
        if (cachedRole) {
            return response.code(200).send(cachedRole);
        }
    } catch (error) {
        console.error("ERROR with the cache: ", error);
    }

    try {
        const role = await sequelize.models.Role.findByPk(id);
        if (!role) {
            return response.code(404).send({
                error: 'Role not found'
            });
        }
        await fastify.cache.set(cacheKey, role, 3600);
        return response.code(200).send(role);
    } catch (error) {
        console.error('ERROR: retrieving role:', error);
        return response.code(500).send({
            error: 'Failed to retrieve role'
        });
    }
});

fastify.post('/volunteer', async (request, response) => {
    const volunteerData = request.body;
    const { name, roleName, candidateId } = volunteerData;
    const candidate = await sequelize.models.Candidate.findByPk(candidateId);
    const role = await sequelize.models.Role.findAll({ where: { name: roleName } })
    if (!candidate) {
        return response.code(404).send({
            error: 'Candidate not found'
        });
    };
    try {
        const volunteer = await sequelize.models.Volunteer.create({ name, RoleName: roleName });
        volunteer.addCandidate(candidate);
        volunteer.addRole(role)
        return response.code(201).send(volunteer);
    } catch (error) {
        postErrorConflict(error, response, 'Volunteer');
    };
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

fastify.get('/volunteer/:id', async (request, response) => {
    const { id } = request.params;
    try {
        const volunteer = await sequelize.models.Volunteer.findByPk(id, { include: [{ model: Role }, { model: Candidate }] });
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
            error: 'Failed to retrieve one volunteer'
        });
    }
});
fastify.get('/volunteers', async (request, response) => {
    try {
        const { name, order } = request.query;
        const queryOptions = {
            where: {},
            order: [],
            include: [{ model: Role }, { model: Candidate }]
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



fastify.post('/event', async (request, response) => {
    const eventData = request.body;
    if (!eventData.moneyRaised || !eventData.date || !eventData.startTime || !eventData.endTime) {
        return response.status(400).send({
            error: 'Bad Request: Missing required fields'
        });
    }
    const volunteers = await sequelize.models.Volunteer.findAll({
        where: {
            id: {
                [Sequelize.Op.in]: eventData.staff
            }
        }
    });

    try {
        const event = await sequelize.models.Event.create(eventData);
        event.addVolunteers(volunteers);

        response.code(201).send(event);
    } catch (error) {
        console.error('ERROR: creating event:', error);
        response.status(500).send({
            error: 'Failed to create event'
        });
    };

});

fastify.get('/event', async (request, response) => {
    const cacheKey = 'events';
    try {
        const cachedEvents = await fastify.cache.get(cacheKey);
        if (cachedEvents) {
            return response.code(200).send(cachedEvents);
        }
    } catch (error) {
        console.error("ERROR with the event cache: ", error);
    }

    try {
        const events = await sequelize.models.Event.findAll({
            include: [{ model: Volunteer }, { model: Attendee }]
        });
        await fastify.cache.set(cacheKey, events, 3600);
        return response.code(200).send(events);
    } catch (error) {
        console.error('ERROR: retrieving events:', error);
        return response.status(500).send({
            error: 'Failed to retrieve events'
        });
    }
});

fastify.put('/event/:id', async (request, response) => {
    const { id } = request.params;
    const updatedData = request.body;

    try {
        const event = await sequelize.models.Event.findByPk(id);
        if (!event) {
            return response.code(404).send({
                error: 'Event not found'
            });
        }
        await event.update(updatedData);
        return response.code(200).send({
            message: 'Event updated successfully',
            event: event
        });
    } catch (error) {
        console.error('ERROR: updating event:', error);
        response.code(500).send({
            error: 'Failed to update event'
        });
    }
});

fastify.post('/attendee', async (request, response) => {
    const attendeeData = request.body;
    const { name, contactInfo, isInterestedInVolunteering, donationAmount, interestedVolunteerRole, eventID } = attendeeData;

    if (!name || !contactInfo || !isInterestedInVolunteering || !donationAmount || !interestedVolunteerRole || !eventID) {
        return response.status(400).send({
            error: 'Bad Request: Missing Required Fields'
        });
    };

    const event = await sequelize.models.Event.findByPk(eventID);
    if (!event) {
        return response.status(404).send({
            error: 'Event not found'
        });
    };
    try {
        const attendee = await sequelize.models.Attendee.create(attendeeData);
        attendee.addEvent(event);
        return response.code(201).send(attendee);
    } catch (error) {
        console.error('ERROR: creating attendee:', error);
        return response.status(500).send({
            error: 'Failed to create attendee'
        });
    }
});

fastify.get('/attendee/:id', async (request, response) => {
    const { id } = request.params;
    const cacheKey = `attendee-${id}`;
    const cachedResponse = await fastify.cache.get(cacheKey);
    if (cachedResponse) {
        return response.code(200).send(cachedResponse);
    };

    try {
        const attendee = await sequelize.models.Attendee.findByPk(id, { include: [{ model: Event }] });
        if (!attendee) {
            return response.code(404).send({
                error: 'Attendee not found'
            });
        }
        response.code(200).send(attendee);
    } catch (error) {
        console.error('ERROR: retrieving attendee:', error);
        response.code(500).send({
            error: 'Failed to retrieve attendee'
        });
    }
});

fastify.put('/attendee/:id', async (request, response) => {
    const { id } = request.params;
    const updateData = request.body;
    try {
        const attendee = await sequelize.models.Attendee.findByPk(id);
        if (!attendee) {
            return response.code(404).send({
                error: 'Attendee not found'
            });
        };
        attendee.update(updateData);
        await fastify.cache.delete(`attendee-${id}`);
        return response.code(200);
    } catch (error) {
        console.error('Error updating attendee:', error);
        response.code(500).send({
            error: 'Failed to update attendee'
        });
    }
});

fastify.listen({
    port: 3000
}, function (err, address) {
    if (err) {
        console.log.error(err)
        process.exit(1)
    }
});
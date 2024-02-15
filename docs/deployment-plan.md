## API Code Plan

### Tech Stack
* TypeScript
* Node.js
* PostgreSQL

### Architecture

[todo: create this]

### Table of Contents
1. [Deployment Plan](#deployment-plan)
2. [Testing](#testing)
3. [Monitoring](#monitoring)
4. [Rollback Plan ](#rollback-plan)
5. [Roadmap to Deployment](#future-features)

<hr/>

### 1. Deployment Plan <a name="deployment-plan"></a>
- Rolling Deployment - Reasons to use:
  - Prevents downtimes
  - Monitoring errors during rollout + roll-back when needed
  - Combine with continuous deployment and also %-based rollouts
- CI/CD pipeline for continual deployment
  - Assign a build number based on X number of changes, we may also want to manually rev the build as needed
- The deployment will be dependent on what additional features, testing, monitoring, etc. but assuming we use **API Gateway**:
  - The implementation details to deploy to API Gateway are [already known](https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started-with-private-integration.html) so the rest of this document will be focused on getting the API in a deployment ready state.
  - We can utilize stages from API GateWay as well for controlled rollouts.

### 2. Testing <a name="testing"></a>
- E2E testing
  - Create scripts for testing major endpoints, these should be run semi-frequently and then output should go to monitoring, tests should cover all major endpoints, should cover success / failure states
- Unit Tests
  - We can use a library like `Jest`, good for mocking and also tracking test coverage

### 3. Monitoring <a name="monitoring"></a>
- This one will need a little more research, we could build our own or utilize a monitoring framework, there's pros and cons to each
- Requirements:
  - Have monitoring / graphs for both business and errors
  - Track reliability, availability, able to filter using a time range, able to output a report based on time range
  - Should refresh itself by pulling data automatically, should track if this service fails

### 4. Rollback Plan <a name="rollback-plan"></a>
- Agree on conditions for a rollback vs a hotfix
- Create a plan for running a post-mortem

### 5. Roadmap to Deployment <a name="future-features"></a>
- Additional featuers needed before we deploy to PROD
  - Authentication for the API (e.g. a `JWT` token)
    - Create a script to generate these tokens for use in the E2E test and also manual testing by the team
  - Rate-Limiting / 429
    - To discuss: we could start with 100 requests per minute
  - Caching changes
    - Move in-memory to a caching layer like ElastiCache
    - Also set a cache expiry to remove items from cache
  - Discuss using a NoSQL db like DynamoDB for scalability, high-performance
  - Logging
    - In order to achieve the monitoring objective, we'll need a way to log our errors and any other data
    - Client side and server side errors should be separated
  - Documentation
    - There's example curl commands as comments but these should live in their own docs

- Nice to haves:
  - Batch Calls, Additional API routes
    - There's a bit of this already in the routes for candidates and volunteers but this should be implemented in events and attendances as well
  - Feature Flags
  - More Sensible Error Messages for the API callee

## Questions

#### 1. Will you do this serverless or on a running instance? Tell us about it

Overall, I would lean towards serverless based on current engineering resources.

Serverless can scale automatically, we don't need to manage the infrastructure as much. If our team expands and our user number greatly increases, we can discuss a migration to running instances. For an API, I would also be looking at factors like availability and based on SLAs at https://aws.amazon.com/api-gateway/sla/, it seems to fit our needs.

Serverless would allow our small team to be a little more hands off so we can focus on other engineering work.

|          | Serverless (API GateWay) | Running Instance (EC2) |
| :------: | :------: | ----: |
| **Scalability** | Scales automatically, on demand | Manual scaling |
| **Availability** | Built-in | Dependent on how servers are managed |
| **Infrastructure Management**  | Fairly hands off | Will need to manage and scale servers |
| **COGs management** | Due to hands off nature, less control over resource management | More control here due to having greater view of the underlying infrastructure |

#### 2. Add your question here


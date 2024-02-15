# ndtc-backend-skills-test-2024

### Jen's notes 

#### Tech Stack
* TypeScript
* Node.js

<hr/>

## Assessment requirements 

Develop a backend REST service to organize and rolodex campaign personnel as well as metrics of campaign events 
Main entities to track in this service are.


Here's some of the important data entitities this service should work with.

### Campaigns


  
### candidates
Important fields are:
*   first name
*   Last name
*   District
*   Office
  
### Volunteers
should belongs to a candidate/campaign
Important fields are: 
*   Name
*   role


### Events 
some things this entity should track  
* name
* What people staffed this event? 
* how much Money raised at this event
* Date
* Start time 
* End time


### Attendances / leads
* name 
* Contact info 
* Interested in volunteering?
* if so what kind of role?
* Donation amount?

### The service should be able to:
* Add / update / read candidates / volunteers
* Add / update / read events and attendances
* Filter and order results based on fields 
order candidates based on money raised, attendance, donations of events
* *Bonus*: Generate a time series graph showing attendance / donation amount / volunteer signups of candidates over time
* Build this using any db or framework that makes sense to you
* Implement some type of caching plan 
* Have a deployment plan ready to walk thru and discuss
*   Will you do this serverless or on a running instance? Tell us about it

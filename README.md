# Transaction Aggregation Service

A NestJS-based service that manages transaction data with real-time caching and periodic synchronization.

## Features

- Real-time transaction data aggregation
- Minute-by-minute data synchronization
- User balance tracking
- Transaction history with filtering
- Payout request management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

```bash
$ npm install
```

## Compile and run the project

```bash
$ npm run start
```

## Run tests

```bash
# unit tests
$ npm run test

# test coverage
$ npm run test:cov
```

## Manual Testing the API
```bash
# Get user data
http://localhost:3000/aggregation/user/085123

# Get user transactions from a specific date (date to be changed to a valid date)
http://localhost:3000/aggregation/user/085123/transactions?startDate=2023-03-01

# Get all transactions from a specific date (date to be changed to a valid date)
http://localhost:3000/aggregation/transactions?startDate=2023-03-01

# Get payout requests
http://localhost:3000/aggregation/payouts
```

## Limitations
 - The service does not handle concurrent requests.
 - The service uses in-memory caching, which is not suitable for a large scale application, in this mvp I decided to keep it simple.
 - All the errors are handled by a logger and the responses for failed transactions are not returned to the client. The best practice here would be to reply with the appropriate status code and message.
 - The transactions API is mocked and the limitations are not applied in the code. From the service perspective, the requests happend every 15 seconds (to not go beyond max 5 requests per minute).
 - In this MVP the user not found is not handled and the error is thrown, mainly because I do not use a database to check, thus we create a new user for any request for the first time we encounter a transaction for a user.


##  Testing Strategy Overview
The optimal testing strategy should include:
 - Unit Tests for the controllers, services and business logic
 - Integration Tests with API endpoints, database interactions and service interactions
 - E2E Tests for the API endpoints and user flows
 - Performance Tests Response times and load testing and database efficiency

## TDD Implementation Approach

 - to make the testing process automated, I would add a prettier and/or eslint configuration to the project, that would run on every commit.
 - then I would add the unit tests and the integration tests to the CI/CD pipeline, that would run on every PR to main. 
 - I would also add a coverage report to the CI/CD pipeline, that would run on every PR to main.
 - Some optional steps would be to add commit message validation to the CI/CD pipeline, that would run on every PR to main. (for example, the commit message should be in the format of "feat: add new feature" or "fix: fix bug" and a link to the issue for Jira or any other issue tracker).
 - I would also add a code review step to the CI/CD pipeline, that would run on every PR to main. (for example, the code should be reviewed by another developer before it is merged to main).
 -  In every PR a small smoke test suite should be run to check if the main functionality is working as expected. (this suite could be a e2e test suite that would be run in a docker container with a specific image for the service or with Jeckins or any other CI/CD tool).
 - finally, I would add a post-merge step to the CI/CD pipeline, that would run regression tests and performance tests on the main branch to check if the new changes have not broken the existing functionality. (assuming that the regression tests are not taking too long to run, in that case I would run a small subset of the tests and then in every sprint end I would run the full regression tests suite).


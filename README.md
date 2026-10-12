# Social Media Application (Backend)

## Description

This repository contains the backend service for a social media application.

The application is built with **TypeScript**, **NestJS**, **TypeORM**, **PostgreSQL**, and **Redis**. For deployment, it uses **Docker* and **AWS services (ECS and S3, RDS, ElastiCache)**.

## Prerequisites

Before running the project, ensure that you have:

For local development:

- Git
- Docker
- Docker Compose
- Node.js

For production deployment:

- AWS ECR, ECS, RDS, S3, ElastiCache

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

Install dependencies(for local development):

```bash
npm install
```

## Running the Application

### Development Mode

```bash
docker compose up -d
npm run start:dev
```
> **Note:** Make sure that you stop web server or Nginx container, as it may cause port conflicts and contanstly restarting nginx container (because there is no SSL certificate on your machine).

## Deployment

The application is designed to be deployed using:

* ECS, RDS, ElastiCache and S3

Ensure that all required environment variables are configured before deployment.

This project is licensed under the MIT License.

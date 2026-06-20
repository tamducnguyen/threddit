# Social Media Application (Backend)

## Description

This repository contains the backend service for a social media application.

The application is built with **TypeScript**, **NestJS**, **TypeORM**, **PostgreSQL**, and **Redis**. For deployment, it uses **Docker**, **Nginx**, and **AWS services (EC2 and S3)**.

## Prerequisites

Before running the project, ensure that you have:

For local development:

- Git
- Docker
- Docker Compose
- Node.js

For production deployment:

- AWS EC2 instance
- AWS S3 bucket
- Git installed on the EC2 instance
- An SSL certificate configured on the EC2 instance (e.g., Let's Encrypt)

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

### Production Mode

```bash
docker compose up -d
```

## Deployment

The application is designed to be deployed using:

* Docker
* Nginx
* AWS EC2
* AWS S3

Ensure that all required environment variables are configured before deployment.

## Tech Stack

### Backend

* TypeScript
* NestJS
* TypeORM
* PostgreSQL
* Redis

### Infrastructure

* Docker
* Nginx
* AWS EC2
* AWS S3

## License

This project is licensed under the MIT License.

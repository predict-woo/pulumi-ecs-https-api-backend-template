# ReadX AWS Infrastructure

This directory contains the Pulumi program for deploying the ReadX backend infrastructure on AWS. The infrastructure is defined in `index.ts` using TypeScript.

## Architecture Overview

The Pulumi program in `index.ts` provisions the following AWS resources to run the ReadX NestJS backend application:

-   **AWS Fargate Service on an ECS Cluster**: The backend application runs as a containerized service using AWS Fargate, which removes the need to manage servers.
-   **Application Load Balancer (ALB)**: An ALB is set up to distribute incoming HTTP traffic to the Fargate service.
-   **ECR (Elastic Container Registry)**: A private ECR repository stores the Docker image for the NestJS application.

## `index.ts` Structure

The `infra/index.ts` file defines the cloud infrastructure. Here's a breakdown of its components:

1.  **Configuration**: It uses `pulumi.Config` to load necessary environment variables and secrets for the application. These include database connection strings, API keys, and other sensitive data.

2.  **ECS Cluster**: A new ECS cluster (`aws.ecs.Cluster`) is created to host the containerized services.

3.  **Networking**: An Application Load Balancer (`awsx.lb.ApplicationLoadBalancer`) is provisioned to route external traffic to the service. It listens on port 80.

4.  **Container Registry**: An ECR repository (`awsx.ecr.Repository`) is created to store the application's Docker image. It is configured to be forcefully deleted on stack destruction to simplify cleanup.

5.  **Image Build & Push**: The script defines an `awsx.ecr.Image` resource. This tells Pulumi to:
    -   Build a Docker image from the source code located in the `../nest` directory.
    -   Target the `linux/arm64` architecture, suitable for AWS Graviton processors.
    -   Push the built image to the ECR repository.

6.  **Fargate Service**: The core `awsx.ecs.FargateService` resource ties everything together:
    -   It launches a task on the ECS cluster using the Fargate launch type.
    -   It uses the Docker image built in the previous step.
    -   It configures CPU (1 vCPU) and memory (2GB) for the container.
    -   It connects the service to the ALB's target group, allowing it to receive traffic.
    -   All the secrets and configurations are securely passed to the container as environment variables.

7.  **Outputs**: Finally, the program exports the DNS name of the ALB, which serves as the public endpoint for the backend service.

## Prerequisites

-   Pulumi CLI (>= v3): https://www.pulumi.com/docs/get-started/install/
-   Node.js (>= 14) and pnpm: https://nodejs.org/ & https://pnpm.io/
-   AWS credentials configured (e.g., via `aws configure` or environment variables).
-   Docker installed and running.

## Deployment

1.  **Install dependencies**:
    ```bash
    cd infra
    pnpm install
    ```

2.  **Configure Pulumi Stack**:
    If you haven't already, create a new stack (e.g., `dev`):
    ```bash
    pulumi stack init dev
    ```
    Set the required configuration secrets. Use `pulumi config set --secret <key> <value>`. The required keys are listed in `index.ts`, for example:
    -   `DATABASE_URL`
    -   `DIRECT_URL`
    -   `BIZM_USERID`
    -   ...and others.

3.  **Deploy**:
    Preview and deploy the infrastructure:
    ```bash
    pulumi up
    ```

4.  **Cleanup**:
    When you're finished, tear down your stack's resources:
    ```bash
    pulumi destroy
    ```
    And remove the stack:
    ```bash
    pulumi stack rm
    ```

## Project Layout

- `Pulumi.yaml` — Pulumi project and template metadata
- `index.ts` — Main Pulumi program (creates an S3 bucket)
- `package.json` — Node.js dependencies
- `tsconfig.json` — TypeScript compiler options

## Configuration

| Key           | Description                             | Default     |
| ------------- | --------------------------------------- | ----------- |
| `aws:region`  | The AWS region to deploy resources into | `us-east-1` |

Use `pulumi config set <key> <value>` to customize configuration.

## Next Steps

- Extend `index.ts` to provision additional resources (e.g., VPCs, Lambda functions, DynamoDB tables).
- Explore [Pulumi AWSX](https://www.pulumi.com/docs/reference/pkg/awsx/) for higher-level AWS components.
- Consult the [Pulumi documentation](https://www.pulumi.com/docs/) for more examples and best practices.

## Getting Help

If you encounter any issues or have suggestions, please open an issue in this repository.
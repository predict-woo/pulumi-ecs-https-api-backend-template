// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

// Require secrets and configuration variables.
// These are placeholders and should be set for your specific environment.
// Example: `pulumi config set acmCertificateArn arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id`
const acmCertificateArn = config.require("acmCertificateArn");
const route53ZoneId = config.require("route53ZoneId");
const domainName = config.require("domainName");

// Example of how to pass environment variables to the container.
// You can add more secrets or environment variables here.
const env = {
  PORT: "80",
  NODE_ENV: "production",
  DATABASE_URL: config.requireSecret("DATABASE_URL"), // Example secret
};

// An ECS cluster to deploy into.
const cluster = new aws.ecs.Cluster("app-cluster");

// An ALB to serve the container endpoint to the internet.
// It listens on HTTP and redirects to HTTPS.
const alb = new awsx.lb.ApplicationLoadBalancer("app-lb", {
  listeners: [
    {
      port: 80,
      protocol: "HTTP",
      defaultActions: [
        {
          type: "redirect",
          redirect: {
            protocol: "HTTPS",
            port: "443",
            statusCode: "HTTP_301",
          },
        },
      ],
    },
    {
      port: 443,
      protocol: "HTTPS",
      certificateArn: acmCertificateArn,
    },
  ],
});

// Create a Route53 A record to point the domain to the ALB.
new aws.route53.Record(domainName, {
  name: domainName,
  zoneId: route53ZoneId,
  type: "A",
  aliases: [
    {
      name: alb.loadBalancer.dnsName,
      zoneId: alb.loadBalancer.zoneId,
      evaluateTargetHealth: true,
    },
  ],
});

// An ECR repository to store our application's container image.
const repo = new awsx.ecr.Repository("app-repo", {
  forceDelete: true,
});

// Build and publish a Docker image to the ECR repository.
// The image is built from a local directory.
const img = new awsx.ecr.Image("app-img", {
  repositoryUrl: repo.url,
  // Replace with the path to your application's source code.
  context: "./path/to/your/app",
  platform: "linux/arm64",
});

// A Fargate service running on the ECS cluster.
const service = new awsx.ecs.FargateService("app-service", {
  assignPublicIp: true,
  cluster: cluster.arn,
  desiredCount: 1,
  taskDefinitionArgs: {
    runtimePlatform: {
      cpuArchitecture: "ARM64",
    },
    container: {
      image: img.imageUri,
      name: "app-container",
      cpu: 128,
      memory: 1024,
      portMappings: [
        {
          containerPort: 80,
          targetGroup: alb.defaultTargetGroup,
        },
      ],
      environment: Object.entries(env).map(([key, value]) => ({
        name: key,
        value: value,
      })),
    },
  },
});

// The URL at which the container's HTTP endpoint will be available.
export const url = pulumi.interpolate`https://${domainName}`;

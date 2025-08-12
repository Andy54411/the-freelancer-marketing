#!/usr/bin/env python3

import aws_cdk as cdk
from email_stack import TaskiloEmailStack

app = cdk.App()
TaskiloEmailStack(app, "TaskiloEmailStack",
    env=cdk.Environment(
        account='637423341295',  # Taskilo AWS Account
        region='eu-central-1'    # Frankfurt Region
    ),
    description="Taskilo Email Management System - AWS Lambda + DynamoDB"
)

app.synth()

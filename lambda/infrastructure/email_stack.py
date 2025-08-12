# AWS CDK Infrastructure für Taskilo Email System
# Ersetzt Vercel API Routes mit nativen AWS Lambda Functions

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_ses as ses,
    aws_dynamodb as dynamodb,
    aws_sns as sns,
    aws_apigateway as apigateway,
    aws_iam as iam,
    Duration,
    RemovalPolicy
)
from constructs import Construct

class TaskiloEmailStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # DynamoDB Tables for Complete Email System
        
        # Admin Emails Table (replaces Firebase inbox emails)
        self.admin_emails_table = dynamodb.Table(
            self, "TaskiloAdminEmails",
            table_name="TaskiloAdminEmails",
            partition_key=dynamodb.Attribute(
                name="emailId",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
            point_in_time_recovery=True,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Global Secondary Indexes for Admin Emails
        self.admin_emails_table.add_global_secondary_index(
            index_name="MessageIdIndex",
            partition_key=dynamodb.Attribute(
                name="messageId",
                type=dynamodb.AttributeType.STRING
            )
        )

        self.admin_emails_table.add_global_secondary_index(
            index_name="TimestampIndex",
            partition_key=dynamodb.Attribute(
                name="receivedAt",
                type=dynamodb.AttributeType.STRING
            )
        )

        # Email Templates Table (replaces Firebase templates)
        self.email_templates_table = dynamodb.Table(
            self, "TaskiloEmailTemplates",
            table_name="TaskiloEmailTemplates",
            partition_key=dynamodb.Attribute(
                name="templateId",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN
        )

        # Email Contacts Table (replaces Firebase contacts)
        self.email_contacts_table = dynamodb.Table(
            self, "TaskiloEmailContacts",
            table_name="TaskiloEmailContacts",
            partition_key=dynamodb.Attribute(
                name="contactId",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN
        )

        # Global Secondary Index for Email Contacts
        self.email_contacts_table.add_global_secondary_index(
            index_name="EmailIndex",
            partition_key=dynamodb.Attribute(
                name="email",
                type=dynamodb.AttributeType.STRING
            )
        )

        # Sent Emails Table (replaces Firebase sent emails)
        self.sent_emails_table = dynamodb.Table(
            self, "TaskiloSentEmails",
            table_name="TaskiloSentEmails",
            partition_key=dynamodb.Attribute(
                name="emailId",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        )

        # Global Secondary Indexes for Sent Emails
        self.sent_emails_table.add_global_secondary_index(
            index_name="MessageIdIndex",
            partition_key=dynamodb.Attribute(
                name="messageId",
                type=dynamodb.AttributeType.STRING
            )
        )

        self.sent_emails_table.add_global_secondary_index(
            index_name="SentAtIndex",
            partition_key=dynamodb.Attribute(
                name="sentAt",
                type=dynamodb.AttributeType.STRING
            )
        )

        # Lambda Function for Email Operations
        self.email_operations_lambda = _lambda.Function(
            self, "TaskiloEmailOperations",
            function_name="TaskiloEmailOperations",
            runtime=_lambda.Runtime.NODEJS_20_X,
            handler="index.handler",
            code=_lambda.Code.from_asset("./email-operations"),
            timeout=Duration.seconds(30),
            memory_size=512,
            environment={
                "AWS_REGION": self.region,
                "ADMIN_EMAILS_TABLE": self.admin_emails_table.table_name,
                "EMAIL_TEMPLATES_TABLE": self.email_templates_table.table_name,
                "EMAIL_CONTACTS_TABLE": self.email_contacts_table.table_name,
                "SENT_EMAILS_TABLE": self.sent_emails_table.table_name,
                "FROM_EMAIL": "noreply@taskilo.de"
            }
        )

        # Grant Lambda permissions to DynamoDB tables
        self.admin_emails_table.grant_full_access(self.email_operations_lambda)
        self.email_templates_table.grant_full_access(self.email_operations_lambda)
        self.email_contacts_table.grant_full_access(self.email_operations_lambda)
        self.sent_emails_table.grant_full_access(self.email_operations_lambda)

        # Grant Lambda permissions for SES
        self.email_operations_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "ses:SendEmail",
                    "ses:SendRawEmail",
                    "ses:GetIdentityDkimAttributes",
                    "ses:GetIdentityVerificationAttributes"
                ],
                resources=["*"]
            )
        )

        # Grant Lambda permissions for SNS (notifications)
        self.email_operations_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "sns:Publish"
                ],
                resources=["*"]
            )
        )

        # API Gateway for Lambda (replaces Vercel API routes)
        self.api = apigateway.RestApi(
            self, "TaskiloEmailApi",
            rest_api_name="Taskilo Email Operations API",
            description="API for Taskilo email management operations",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=["*"],
                allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                allow_headers=["Content-Type", "Authorization"]
            )
        )

        # Lambda integration
        lambda_integration = apigateway.LambdaIntegration(
            self.email_operations_lambda,
            proxy=True,
            integration_responses=[
                apigateway.IntegrationResponse(
                    status_code="200",
                    response_parameters={
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                )
            ]
        )

        # API Routes (replacing /api/admin/emails/*)
        # /admin/emails/inbox
        admin = self.api.root.add_resource("admin")
        emails = admin.add_resource("emails")
        
        inbox = emails.add_resource("inbox")
        inbox.add_method("GET", lambda_integration)
        inbox.add_method("PATCH", lambda_integration)
        inbox.add_method("DELETE", lambda_integration)
        
        # /admin/emails/inbox/{id}
        inbox_id = inbox.add_resource("{id}")
        inbox_id.add_method("GET", lambda_integration)
        inbox_id.add_method("PATCH", lambda_integration)
        inbox_id.add_method("DELETE", lambda_integration)
        
        # /admin/emails/inbox/{id}/reply
        inbox_reply = inbox_id.add_resource("reply")
        inbox_reply.add_method("POST", lambda_integration)

        # /admin/emails/templates
        templates = emails.add_resource("templates")
        templates.add_method("GET", lambda_integration)
        templates.add_method("POST", lambda_integration)
        
        # /admin/emails/templates/{id}
        templates_id = templates.add_resource("{id}")
        templates_id.add_method("GET", lambda_integration)
        templates_id.add_method("PUT", lambda_integration)
        templates_id.add_method("DELETE", lambda_integration)

        # /admin/emails/contacts
        contacts = emails.add_resource("contacts")
        contacts.add_method("GET", lambda_integration)
        contacts.add_method("POST", lambda_integration)
        
        # /admin/emails/contacts/{id}
        contacts_id = contacts.add_resource("{id}")
        contacts_id.add_method("GET", lambda_integration)
        contacts_id.add_method("PUT", lambda_integration)
        contacts_id.add_method("DELETE", lambda_integration)

        # /admin/emails/send
        send = emails.add_resource("send")
        send.add_method("POST", lambda_integration)

        # /admin/emails/stats
        stats = emails.add_resource("stats")
        stats.add_method("GET", lambda_integration)

        # Outputs
        cdk.CfnOutput(
            self, "EmailApiUrl",
            value=self.api.url,
            description="URL for the Email Operations API (replaces /api/admin/emails/*)"
        )

        cdk.CfnOutput(
            self, "EmailLambdaArn",
            value=self.email_operations_lambda.function_arn,
            description="ARN of the Email Operations Lambda function"
        )

        cdk.CfnOutput(
            self, "AdminEmailsTableName",
            value=self.admin_emails_table.table_name,
            description="Name of the Admin Emails DynamoDB table"
        )

        cdk.CfnOutput(
            self, "EmailTemplatesTableName",
            value=self.email_templates_table.table_name,
            description="Name of the Email Templates DynamoDB table"
        )

        cdk.CfnOutput(
            self, "EmailContactsTableName",
            value=self.email_contacts_table.table_name,
            description="Name of the Email Contacts DynamoDB table"
        )

        cdk.CfnOutput(
            self, "SentEmailsTableName",
            value=self.sent_emails_table.table_name,
            description="Name of the Sent Emails DynamoDB table"
        )

# CDK App instantiation
app = cdk.App()
TaskiloEmailStack(app, "TaskiloEmailStack",
    env=cdk.Environment(
        account="319629020205",  # Deine AWS Account ID
        region="eu-central-1"
    )
)
app.synth()

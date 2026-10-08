/**
 * SmartAttend - AWS Cloud Architecture Configuration & Service Registry
 * 
 * This module defines the AWS cloud integration contracts. In production, these parameters
 * are populated via environment variables or AWS Systems Manager Parameter Store.
 * 
 * Supported AWS Services:
 * - Amazon Cognito: User authentication, JWT tokens, session lifecycle
 * - Amazon API Gateway: REST & WebSocket endpoints for RFID ingestion & web clients
 * - AWS Lambda: Serverless execution of attendance logic & scheduled tasks
 * - Amazon DynamoDB: Scalable NoSQL single-table storage for attendance & metadata
 * - Amazon SNS: Real-time student & faculty notifications (SMS/Email/Mobile Push)
 * - Amazon EventBridge: Scheduled cron events for 30m/15m/5m class reminders
 * - Amazon CloudWatch: Audit trail, telemetry, alarms, and RFID tap latency logs
 * - Amazon S3: Static website hosting and report exports
 */

const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  environment: process.env.NODE_ENV || 'development',
  
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_SmartAttendPool',
    appClientId: process.env.COGNITO_APP_CLIENT_ID || 'smartattend-web-client-id',
    identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || 'us-east-1:00000000-0000-0000-0000-000000000000',
    authFlowType: 'USER_PASSWORD_AUTH',
    tokenValidityHours: 24
  },

  apiGateway: {
    restEndpoint: process.env.API_GATEWAY_REST_URL || 'https://api.smartattend.aws.edu/v1',
    websocketEndpoint: process.env.API_GATEWAY_WS_URL || 'wss://ws.smartattend.aws.edu/v1',
    stage: 'production',
    routes: {
      rfidScan: '/api/rfid/scan',
      attendanceLive: '/api/attendance/live',
      studentStats: '/api/attendance/student/{id}',
      todayTimetable: '/api/timetable/today',
      rulesConfig: '/api/rules',
      exportReport: '/api/reports/export'
    }
  },

  lambda: {
    functions: {
      attendanceProcessor: 'arn:aws:lambda:us-east-1:123456789012:function:smartattend-rfid-processor',
      timetableMatcher: 'arn:aws:lambda:us-east-1:123456789012:function:smartattend-timetable-matcher',
      reminderDispatcher: 'arn:aws:lambda:us-east-1:123456789012:function:smartattend-reminder-dispatcher',
      reportGenerator: 'arn:aws:lambda:us-east-1:123456789012:function:smartattend-report-generator'
    },
    timeoutSeconds: 15,
    memorySizeMB: 512
  },

  dynamodb: {
    tableName: process.env.DYNAMODB_TABLE || 'SmartAttendCore',
    billingMode: 'PAY_PER_REQUEST',
    keys: {
      pk: 'PK',         // Partition Key: e.g. "STUDENT#23CS01042", "CLASS#CS301", "READER#LAB-02"
      sk: 'SK',         // Sort Key: e.g. "ATTENDANCE#2026-09-17T10:04:15", "PROFILE", "TIMETABLE"
      gsi1pk: 'GSI1PK', // e.g. "DATE#2026-09-17"
      gsi1sk: 'GSI1SK'  // e.g. "TIME#10:04:15"
    }
  },

  sns: {
    topicArns: {
      attendanceAlerts: 'arn:aws:sns:us-east-1:123456789012:smartattend-attendance-alerts',
      classReminders: 'arn:aws:sns:us-east-1:123456789012:smartattend-class-reminders',
      adminCriticalThresholds: 'arn:aws:sns:us-east-1:123456789012:smartattend-admin-alarms'
    }
  },

  eventBridge: {
    busName: 'smartattend-events',
    rules: {
      classReminderCron: 'cron(*/5 8-18 ? * MON-SAT *)', // Trigger every 5 mins during class hours
      attendanceReconciler: 'cron(0 18 ? * MON-SAT *)'     // End-of-day attendance rollup
    }
  },

  s3: {
    bucketName: 'smartattend-assets-and-reports',
    publicWebUrl: 'https://smartattend.s3-website.us-east-1.amazonaws.com'
  },

  cloudWatch: {
    logGroupName: '/aws/smartattend/application',
    metricNamespace: 'SmartAttend/RFID',
    metrics: [
      'SuccessfulScans',
      'LateScans',
      'DuplicateScansRejected',
      'InvalidCardsDetected',
      'ProcessingLatencyMS'
    ]
  }
};

module.exports = AWS_CONFIG;

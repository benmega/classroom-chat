#!/bin/bash

# 1. Get the authentication token and Public IP
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)

# Stop if IP is empty
if [ -z "$PUBLIC_IP" ]; then
    echo "Error: Could not retrieve Public IP."
    exit 1
fi

# --- CONFIGURATION ---
HOSTED_ZONE_ID="Z0911102RSQP89B1KQ6O"
RECORD_NAME="api-blossom.benmega.com."
TTL_VALUE="60"
HEALTH_CHECK_ID="a33dab36-6d55-471e-991f-85ccc3fd05c6"
SET_IDENTIFIER="classroom-chat-ec2-primary"
# ---------------------

# 2. Update the DNS Record (Standard Route 53 Update)
cat > /tmp/route53_changes.json << EOF
{
  "Comment": "Update Failover A record on EC2 start",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${RECORD_NAME}",
        "Type": "A",
        "TTL": ${TTL_VALUE},
        "SetIdentifier": "${SET_IDENTIFIER}",
        "Failover": "PRIMARY",
        "HealthCheckId": "${HEALTH_CHECK_ID}",
        "ResourceRecords": [
          {
            "Value": "${PUBLIC_IP}"
          }
        ]
      }
    }
  ]
}
EOF

# Execute DNS Update
/usr/local/bin/aws route53 change-resource-record-sets \
  --hosted-zone-id ${HOSTED_ZONE_ID} \
  --change-batch file:///tmp/route53_changes.json

# 3. Update the Route 53 Health Check to target the NEW IP
/usr/local/bin/aws route53 update-health-check \
  --health-check-id ${HEALTH_CHECK_ID} \
  --ip-address ${PUBLIC_IP} \
  --resource-path "/server/health"

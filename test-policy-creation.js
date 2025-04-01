import fetch from 'node-fetch';

const samplePolicies = [
  {
    title: "Vacation Policy",
    content: `# Vacation Policy
    
## Overview
Our company provides paid vacation time to all full-time employees. This policy outlines the rules and procedures for requesting and taking vacation time.

## Eligibility
- All full-time employees are eligible for paid vacation time
- Employees become eligible after completing 90 days of employment
- Part-time and temporary employees are not eligible for paid vacation

## Vacation Allowance
- Employees with 0-2 years of service: 10 days (80 hours) per year
- Employees with 3-5 years of service: 15 days (120 hours) per year
- Employees with 6+ years of service: 20 days (160 hours) per year

## Requesting Vacation Time
1. Submit vacation requests at least two weeks in advance
2. Get approval from your direct supervisor
3. Submit the approved request to HR

## Carryover Policy
- Up to 5 unused vacation days may be carried over to the next calendar year
- Carried over days must be used within the first quarter of the new year

## Payout of Unused Vacation
- Unused vacation days are not paid out at the end of the year
- Upon termination, employees will be paid for unused vacation time earned

For questions regarding this policy, please contact the HR department.`,
    policyRef: "POL-2025-HR-001",
    version: "1.0",
    categoryId: 4, // This should match your HR category ID
    status: "active"
  },
  {
    title: "Data Security Policy",
    content: `# Data Security Policy

## Purpose
This policy establishes guidelines for protecting company and customer data from unauthorized access, disclosure, or misuse.

## Scope
This policy applies to all employees, contractors, and third parties who have access to company systems or data.

## Password Requirements
- Minimum 12 characters
- Must include uppercase letters, lowercase letters, numbers, and special characters
- Changed every 90 days
- Cannot reuse the previous 5 passwords

## Data Classification
1. **Public**: Information that can be freely shared
2. **Internal**: Information limited to company personnel
3. **Confidential**: Sensitive information requiring special handling
4. **Restricted**: Highly sensitive information with strict access controls

## Data Handling Procedures
- Confidential and Restricted data must be encrypted during transmission and storage
- Sensitive data should not be stored on personal devices
- Regular backups must be performed for all critical systems
- Access to sensitive data must follow the principle of least privilege

## Security Incident Reporting
1. Report all security incidents immediately to the IT Security team
2. Document the nature and scope of the incident
3. Preserve evidence for investigation
4. Follow the incident response plan

## Compliance
Failure to comply with this policy may result in disciplinary action, up to and including termination of employment.`,
    policyRef: "POL-2025-IT-001",
    version: "1.2",
    categoryId: 3, // This should match your Compliance category ID
    status: "active"
  },
  {
    title: "Emergency Response Plan",
    content: `# Emergency Response Plan

## Purpose
This plan outlines procedures for responding to various emergency situations to ensure the safety of all employees and visitors.

## Emergency Response Team
- Emergency Coordinator: [Chief Safety Officer]
- Floor Wardens: [Designated by department]
- First Aid Responders: [Trained staff members]

## Emergency Types Covered
1. **Fire**
2. **Medical Emergency**
3. **Severe Weather**
4. **Active Threat**
5. **Hazardous Material Spill**

## Fire Emergency Procedures
1. If you discover a fire, activate the nearest fire alarm pull station
2. Call emergency services (911) and report the fire
3. Evacuate the building using the nearest exit
4. Do not use elevators
5. Proceed to the designated assembly area
6. Report to your floor warden for headcount
7. Do not re-enter the building until authorized by emergency personnel

## Medical Emergency Procedures
1. Call emergency services (911) for any serious medical emergency
2. Contact a First Aid Responder
3. Do not move the injured/ill person unless they are in immediate danger
4. Provide clear information about the location and nature of the emergency
5. Stay with the person until help arrives

## Severe Weather Procedures
1. Move to designated shelter areas away from windows
2. Follow instructions from the Emergency Response Team
3. Remain in shelter until the all-clear is given

## Training and Drills
- All employees must participate in emergency response training upon hiring
- Evacuation drills will be conducted quarterly
- First aid and CPR training is available to all employees

This plan is reviewed and updated annually or after any emergency situation.`,
    policyRef: "POL-2025-SAFETY-001",
    version: "2.1",
    categoryId: 1, // This should match your Emergency category ID
    status: "active"
  }
];

async function createPolicies() {
  // Login to get authentication
  console.log("Logging in to get authentication cookie...");
  
  const loginResponse = await fetch('https://policybotai.replit.app/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'password123'
    }),
    redirect: 'manual'
  });
  
  if (!loginResponse.ok) {
    console.error("Login failed:", await loginResponse.text());
    return;
  }
  
  // Get cookies for subsequent requests
  const cookies = loginResponse.headers.get('set-cookie');
  
  console.log("Login successful, creating sample policies...");
  
  // Create each policy
  for (const policy of samplePolicies) {
    try {
      console.log(`Creating policy: ${policy.title}...`);
      
      const policyResponse = await fetch('https://policybotai.replit.app/api/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify(policy)
      });
      
      if (policyResponse.ok) {
        const createdPolicy = await policyResponse.json();
        console.log(`Successfully created policy: ${createdPolicy.title} with ID: ${createdPolicy.id}`);
      } else {
        console.error(`Failed to create policy: ${policy.title}`, await policyResponse.text());
      }
    } catch (error) {
      console.error(`Error creating policy: ${policy.title}`, error);
    }
  }
  
  console.log("Done creating sample policies.");
}

createPolicies();
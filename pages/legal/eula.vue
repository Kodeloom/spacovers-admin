<template>
  <div class="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Internal Use Agreement for Spacovers Admin Integration</h1>
      <p class="text-sm text-gray-500 mb-6">Last updated: {{ new Date().toLocaleDateString() }}</p>

      <div class="prose max-w-none text-gray-700">
        <p>This Internal Use Agreement ("Agreement") outlines the terms for accessing and using the Spacovers Admin application ("Application") and its integration with the Company's QuickBooks data. This Agreement is between the Company and you, the employee, who has been granted access to the Application.</p>
        
        <p>By using the Application, you agree to these terms and conditions. If you do not agree, you must not use the Application.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">1. Purpose and Scope of Use</h2>
        <p>The Application is a Company tool designed for the sole purpose of retrieving and viewing confidential data from the Company's QuickBooks account for internal administrative record-keeping and warehouse management operations. The data accessed through the Application is for Company business purposes only.</p>
        
        <p>The Application provides functionality for:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Managing customer information and order data</li>
          <li>Tracking warehouse operations and item processing</li>
          <li>Generating reports for business operations</li>
          <li>Administrative record-keeping and audit trails</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">2. Confidentiality and Data Handling</h2>
        <p>You acknowledge that the Application provides access to confidential and proprietary business information from the Company's QuickBooks Online account. You agree to:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Use this data strictly for authorized business operations</li>
          <li>Not share, copy, or distribute this data to any unauthorized individuals, either inside or outside the Company</li>
          <li>Safeguard your login credentials and report any unauthorized access immediately</li>
          <li>Maintain the confidentiality of all customer information, pricing data, and business records accessed through the Application</li>
          <li>Use the Application only for its intended purpose of warehouse management and administrative operations</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">3. QuickBooks Data Access</h2>
        <p>The Application integrates with the Company's QuickBooks Online account to retrieve customer, item, and order data. You understand that:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>All QuickBooks data accessed through the Application remains the property of the Company</li>
          <li>You may not use the Application to create, modify, or delete QuickBooks data unless explicitly authorized to do so</li>
          <li>Any data synchronization or updates to QuickBooks must be performed through authorized channels only</li>
          <li>The Application is designed for read-only access to most QuickBooks data, with limited write capabilities for specific business operations</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">4. Restrictions</h2>
        <p>You are not permitted to:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Share your access to the Application with other employees or third parties</li>
          <li>Use the Application for any purpose outside the scope of your employment or for any personal gain</li>
          <li>Attempt to alter, modify, or reverse-engineer the Application</li>
          <li>Export or download Company data for unauthorized purposes</li>
          <li>Use the Application on unauthorized devices or networks</li>
          <li>Bypass any security measures implemented in the Application</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">5. Security and Access Control</h2>
        <p>You are responsible for:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Maintaining the security of your login credentials</li>
          <li>Logging out of the Application when not in use</li>
          <li>Reporting any security concerns or suspicious activity immediately</li>
          <li>Not sharing your workstation or leaving the Application open when away from your desk</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">6. Termination</h2>
        <p>Your right to access and use the Application is contingent upon your continued employment with the Company and your authorized need for access. The Company may terminate your access at any time, for any reason, without notice.</p>
        
        <p>Upon termination of your access or employment, you must immediately cease all use of the Application and ensure that no Company data remains accessible to you.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">7. Compliance and Monitoring</h2>
        <p>The Company reserves the right to monitor usage of the Application to ensure compliance with this Agreement and to maintain the security of Company data. All activities within the Application are logged for audit purposes.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">8. Acknowledgment</h2>
        <p>By using the Application, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement. You understand that violation of this Agreement may result in disciplinary action, up to and including termination of employment.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">9. Governing Law</h2>
        <p>This Agreement shall be governed by the internal policies and procedures of the Company and applicable employment laws.</p>

        <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-sm text-blue-800">
            <strong>Important:</strong> This Application is for internal business use only. All data accessed through this system is confidential and proprietary to the Company. Unauthorized access or use may result in legal action.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'empty', 
  auth: false,
});
</script> 
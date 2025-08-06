<template>
  <div class="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Privacy Policy for the Spacovers Admin Integration</h1>
      <p class="text-sm text-gray-500 mb-6">Last updated: {{ new Date().toLocaleDateString() }}</p>

      <div class="prose max-w-none text-gray-700">
        <p>This Privacy Policy outlines how the Company handles data within the Spacovers Admin application ("the Application"). This Application is an internal tool and is not for public use.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">1. Data Collection and Purpose</h2>
        <p>The Application does not collect personally identifiable information from end-users. The only data accessed and used by the Application is retrieved directly from the Company's QuickBooks Online account.</p>
        
        <p>The purpose of accessing this data is solely for internal administrative and warehouse management operations, as described in the Internal Use Agreement. The data is used to provide the core functionality of the Application, including:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Retrieving and displaying customer information</li>
          <li>Managing and tracking order data</li>
          <li>Monitoring item and inventory details</li>
          <li>Generating reports for business operations</li>
          <li>Tracking warehouse operations and item processing</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">2. Handling of QuickBooks Data</h2>
        <p>The Application accesses and stores a limited subset of the Company's QuickBooks data. This data is considered confidential and proprietary to the Company.</p>
        
        <h3 class="text-lg font-medium mt-4 mb-2">Data Storage</h3>
        <p>All QuickBooks data retrieved by the Application is stored securely within the Company's private cloud infrastructure. It is not shared with any third parties or used for any purpose other than providing the Application's internal functionality.</p>
        
        <h3 class="text-lg font-medium mt-4 mb-2">No End-User Data Collection</h3>
        <p>The Application does not collect or store any personal data from the employees using the service. Employee access is managed through the Company's internal authentication systems.</p>
        
        <h3 class="text-lg font-medium mt-4 mb-2">Data Types Accessed</h3>
        <p>The Application accesses the following types of data from the Company's QuickBooks account:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Customer information (names, contact details, addresses)</li>
          <li>Item/product data (descriptions, pricing, categories)</li>
          <li>Order and invoice information</li>
          <li>Transaction history and related metadata</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">3. Data Security</h2>
        <p>The Company is committed to protecting the security of its data. Access to the Application is restricted to authorized employees only. Data is protected by security measures implemented within our hosting environment, including:</p>
        <ul class="list-disc pl-6 mb-4">
          <li>Encrypted data transmission</li>
          <li>Secure authentication and authorization</li>
          <li>Regular security audits and monitoring</li>
          <li>Access logging for audit purposes</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">4. Data Sharing and Third Parties</h2>
        <p>The Application and the data it retrieves are for internal use only. We do not share, sell, or rent any of the QuickBooks data accessed by the Application with any third parties.</p>
        
        <p>The only external service involved in the Application's operation is QuickBooks Online, which is used solely to retrieve the Company's own business data. No data is transmitted to or shared with any other external services.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">5. Employee Access and Monitoring</h2>
        <p>Access to the Application is limited to authorized employees who require it for their job functions. All access is logged and monitored to ensure compliance with internal policies and data security requirements.</p>
        
        <p>Employees are responsible for maintaining the confidentiality of any business data they access through the Application, as outlined in the Internal Use Agreement.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">6. Data Retention</h2>
        <p>Data retrieved from QuickBooks is retained only as long as necessary to provide the Application's functionality. The Company maintains control over data retention policies and may purge or archive data according to internal business requirements.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">7. Changes to this Policy</h2>
        <p>This policy may be updated from time to time to reflect changes in our internal processes or in the Application's functionality. Employees will be notified of any significant changes through internal communication channels.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">8. Contact Information</h2>
        <p>For any questions about this Privacy Policy or data handling within the Application, please contact your supervisor or the Company's IT department.</p>

        <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p class="text-sm text-blue-800">
            <strong>Important:</strong> This is an internal-use-only policy. No personal data is collected from public users, as the service is not publicly available. All data accessed through this Application is confidential and proprietary to the Company.
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
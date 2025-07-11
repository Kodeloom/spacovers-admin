<template>
  <div class="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p class="text-sm text-gray-500 mb-6">Last updated: {{ new Date().toLocaleDateString() }}</p>

      <div class="prose max-w-none text-gray-700">
        <p>Spacovers Admin ("we", "us", or "our") operates the Warehouse Administrator application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
        <p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">1. Information Collection and Use</h2>
        <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
        <h3 class="text-lg font-medium mt-4 mb-2">Types of Data Collected</h3>
        <h4>Personal Data</h4>
        <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
        <ul>
          <li>Email address</li>
          <li>First name and last name</li>
          <li>Phone number</li>
          <li>Usage Data</li>
        </ul>
        
        <h4>QuickBooks Data</h4>
        <p>By connecting your QuickBooks Online account, you authorize us to access and store certain information from your account on your behalf, such as Customers, Items (Products), and Orders. This data is used solely to provide the core functionality of the Service and is treated as confidential information.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">2. Use of Data</h2>
        <p>We use the collected data for various purposes:</p>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To manage your account and your access to the Service</li>
          <li>To provide customer support</li>
          <li>To monitor the usage of the Service</li>
          <li>To detect, prevent and address technical issues</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">3. Data Security</h2>
        <p>The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>
        
        <h2 class="text-xl font-semibold mt-6 mb-2">4. Service Providers</h2>
        <p>We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">5. Links to Other Sites</h2>
        <p>Our Service may contain links to other sites that are not operated by us. If you click on a third party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">6. Changes to This Privacy Policy</h2>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
        <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">7. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us.</p>
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
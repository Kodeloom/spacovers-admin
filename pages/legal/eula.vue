<template>
  <div class="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">End-User License Agreement (EULA)</h1>
      <p class="text-sm text-gray-500 mb-6">Last updated: {{ new Date().toLocaleDateString() }}</p>

      <div class="prose max-w-none text-gray-700">
        <p>This End-User License Agreement ("EULA") is a legal agreement between you and Spacovers Admin ("we", "us", or "our"), the provider of the Warehouse Administrator application (the "Application").</p>
        
        <p>This EULA governs your acquisition and use of our Application directly from us or indirectly through a reseller or distributor (a "Reseller").</p>
        
        <p>Please read this EULA carefully before completing the installation process and using the Application. It provides a license to use the Application and contains warranty information and liability disclaimers.</p>

        <p>By clicking "accept" or installing and/or using the Application, you are confirming your acceptance of the Application and agreeing to become bound by the terms of this EULA.</p>

        <p>If you are entering into this EULA on behalf of a company or other legal entity, you represent that you have the authority to bind such entity and its affiliates to these terms and conditions. If you do not have such authority or if you do not agree with the terms and conditions of this EULA, do not install or use the Application, and you must not accept this EULA.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">1. License Grant</h2>
        <p>We hereby grant you a personal, non-transferable, non-exclusive license to use the Application on your devices in accordance with the terms of this EULA.</p>
        <p>You are permitted to load the Application (for example a PC, laptop, mobile or tablet) under your control. You are responsible for ensuring your device meets the minimum requirements of the Application.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">2. Restrictions</h2>
        <p>You are not permitted to:</p>
        <ul>
            <li>Edit, alter, modify, adapt, translate or otherwise change the whole or any part of the Application nor permit the whole or any part of the Application to be combined with or become incorporated in any other software, nor decompile, disassemble or reverse engineer the Application or attempt to do any such things.</li>
            <li>Reproduce, copy, distribute, resell or otherwise use the Application for any commercial purpose.</li>
            <li>Allow any third party to use the Application on behalf of or for the benefit of any third party.</li>
            <li>Use the Application in any way which breaches any applicable local, national or international law.</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6 mb-2">3. Intellectual Property and Ownership</h2>
        <p>We shall at all times retain ownership of the Application as originally downloaded by you and all subsequent downloads of the Application by you. The Application (and the copyright, and other intellectual property rights of whatever nature in the Application, including any modifications made thereto) are and shall remain our property.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">4. Termination</h2>
        <p>This EULA is effective from the date you first use the Application and shall continue until terminated. You may terminate it at any time upon written notice to us.</p>
        <p>It will also terminate immediately if you fail to comply with any term of this EULA. Upon such termination, the licenses granted by this EULA will immediately terminate and you agree to stop all access and use of the Application.</p>

        <h2 class="text-xl font-semibold mt-6 mb-2">5. Governing Law</h2>
        <p>This EULA, and any dispute arising out of or in connection with this EULA, shall be governed by and construed in accordance with the laws of our operating jurisdiction.</p>
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
export default defineNitroConfig({
  rollupConfig: {
    onwarn(warning, warn) {
      if (warning.message.includes('/root/.nix-profile')) return
      warn(warning)
    },
  },
})
FROM node:22.15-alpine
WORKDIR /my-nuxt-app
COPY . /my-nuxt-app
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
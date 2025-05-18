FROM node:22.15-alpine
WORKDIR /app
COPY prisma-post-script.sh ./prisma-post-script.sh
RUN dos2unix ./prisma-post-script.sh && chmod +x ./prisma-post-script.sh

COPY . /app

RUN npm install
RUN /app/prisma-post-script.sh
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
FROM node:22.15-alpine
WORKDIR /app
COPY . /app
COPY prisma-post-script.sh /app/prisma-post-script.sh
RUN chmod +x /app/prisma-post-script.sh
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
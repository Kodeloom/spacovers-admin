FROM node:22.15-alpine
WORKDIR /app
COPY . /app
RUN rm -f yarn.lock && dos2unix /app/prisma-post-script.sh && chmod +x /app/prisma-post-script.sh
RUN /app/prisma-post-script.sh
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
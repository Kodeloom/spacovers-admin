FROM node:22.15-alpine
WORKDIR /app

COPY . /app

RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
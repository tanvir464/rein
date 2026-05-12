FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src

RUN npx -y typescript@5.6.3 -p tsconfig.json || true

EXPOSE 8788

CMD ["npx", "tsx", "src/index.ts"]

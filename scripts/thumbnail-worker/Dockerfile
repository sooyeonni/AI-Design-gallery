FROM mcr.microsoft.com/playwright:v1.58.2-noble
WORKDIR /worker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY capture.mjs server.mjs ./
USER pwuser
ENTRYPOINT ["node", "/worker/capture.mjs"]

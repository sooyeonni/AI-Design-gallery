FROM node:24-bookworm-slim
WORKDIR /checker
RUN npm init -y && npm install --save-exact playwright@1.58.2 && npx playwright install --with-deps chromium && npm cache clean --force
COPY check.mjs /checker/check.mjs
USER node
CMD ["node", "/checker/check.mjs"]
